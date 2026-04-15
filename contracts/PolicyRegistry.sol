// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PolicyRegistry
 * @notice On-chain registry for Orbit execution policies.
 *
 * Each policy defines:
 *   - maxAutoAmount          — requests at or below this amount execute automatically
 *   - requireManualReviewAbove — requests above this amount require human approval
 *   - requireWhitelist       — if true, recipient must be whitelisted
 *
 * Policy owners can update their own policies, manage whitelists,
 * and activate / deactivate policies at any time.
 */
contract PolicyRegistry {
    // ─── Types ───────────────────────────────────────────────────────────────

    struct Policy {
        bytes32 id;
        string  name;
        uint256 maxAutoAmount;            // auto-execute threshold (in token base units)
        uint256 requireManualReviewAbove; // manual review threshold
        bool    requireWhitelist;
        bool    active;
        address owner;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    uint256 private _policyCount;

    /// policyId → Policy
    mapping(bytes32 => Policy) private _policies;

    /// policyId → address → whitelisted
    mapping(bytes32 => mapping(address => bool)) private _whitelists;

    /// owner → list of policyIds
    mapping(address => bytes32[]) private _ownerPolicies;

    // ─── Events ───────────────────────────────────────────────────────────────

    event PolicyRegistered(bytes32 indexed policyId, address indexed owner, string name);
    event PolicyUpdated(bytes32 indexed policyId);
    event PolicyActiveChanged(bytes32 indexed policyId, bool active);
    event WhitelistUpdated(bytes32 indexed policyId, address indexed addr, bool allowed);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotPolicyOwner(bytes32 policyId);
    error InvalidThresholds(uint256 maxAutoAmount, uint256 manualReviewAbove);
    error PolicyNotFound(bytes32 policyId);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyPolicyOwner(bytes32 policyId) {
        if (_policies[policyId].owner != msg.sender) revert NotPolicyOwner(policyId);
        _;
    }

    // ─── External: Write ──────────────────────────────────────────────────────

    /**
     * @notice Register a new policy.
     * @return policyId Unique identifier for the new policy.
     */
    function registerPolicy(
        string  calldata name,
        uint256 maxAutoAmount,
        uint256 requireManualReviewAbove,
        bool    requireWhitelist
    ) external returns (bytes32 policyId) {
        if (maxAutoAmount > requireManualReviewAbove)
            revert InvalidThresholds(maxAutoAmount, requireManualReviewAbove);

        policyId = keccak256(
            abi.encodePacked(msg.sender, _policyCount++, block.timestamp)
        );

        _policies[policyId] = Policy({
            id:                       policyId,
            name:                     name,
            maxAutoAmount:            maxAutoAmount,
            requireManualReviewAbove: requireManualReviewAbove,
            requireWhitelist:         requireWhitelist,
            active:                   true,
            owner:                    msg.sender,
            createdAt:                block.timestamp,
            updatedAt:                block.timestamp
        });

        _ownerPolicies[msg.sender].push(policyId);

        emit PolicyRegistered(policyId, msg.sender, name);
    }

    /**
     * @notice Update thresholds and whitelist requirement of an existing policy.
     */
    function updatePolicy(
        bytes32 policyId,
        uint256 maxAutoAmount,
        uint256 requireManualReviewAbove,
        bool    requireWhitelist
    ) external onlyPolicyOwner(policyId) {
        if (maxAutoAmount > requireManualReviewAbove)
            revert InvalidThresholds(maxAutoAmount, requireManualReviewAbove);

        Policy storage p = _policies[policyId];
        p.maxAutoAmount            = maxAutoAmount;
        p.requireManualReviewAbove = requireManualReviewAbove;
        p.requireWhitelist         = requireWhitelist;
        p.updatedAt                = block.timestamp;

        emit PolicyUpdated(policyId);
    }

    /** @notice Activate or deactivate a policy. */
    function setActive(bytes32 policyId, bool active)
        external
        onlyPolicyOwner(policyId)
    {
        _policies[policyId].active    = active;
        _policies[policyId].updatedAt = block.timestamp;
        emit PolicyActiveChanged(policyId, active);
    }

    /** @notice Add an address to a policy's whitelist. */
    function addToWhitelist(bytes32 policyId, address addr)
        external
        onlyPolicyOwner(policyId)
    {
        _whitelists[policyId][addr] = true;
        emit WhitelistUpdated(policyId, addr, true);
    }

    /** @notice Remove an address from a policy's whitelist. */
    function removeFromWhitelist(bytes32 policyId, address addr)
        external
        onlyPolicyOwner(policyId)
    {
        _whitelists[policyId][addr] = false;
        emit WhitelistUpdated(policyId, addr, false);
    }

    // ─── External: Read ───────────────────────────────────────────────────────

    /** @notice Return full policy details. */
    function getPolicy(bytes32 policyId) external view returns (Policy memory) {
        return _policies[policyId];
    }

    /** @notice Check whether an address is whitelisted for a policy. */
    function isWhitelisted(bytes32 policyId, address addr)
        external view returns (bool)
    {
        return _whitelists[policyId][addr];
    }

    /** @notice Return all policy IDs registered by an owner. */
    function getOwnerPolicies(address owner)
        external view returns (bytes32[] memory)
    {
        return _ownerPolicies[owner];
    }

    /**
     * @notice Evaluate a request against a policy.
     * @return autoApprove    True if request can execute automatically.
     * @return requiresReview True if human approval is required.
     * @return reason         Human-readable explanation.
     */
    function checkPolicy(
        bytes32 policyId,
        address recipient,
        uint256 amount
    ) external view returns (bool autoApprove, bool requiresReview, string memory reason) {
        Policy storage p = _policies[policyId];

        if (!p.active)
            return (false, false, "Policy is inactive");

        if (p.requireWhitelist && !_whitelists[policyId][recipient])
            return (false, true, "Recipient not whitelisted");

        if (amount > p.requireManualReviewAbove)
            return (false, true, "Amount exceeds manual review threshold");

        if (amount <= p.maxAutoAmount)
            return (true, false, "Within auto-approve limit");

        return (false, true, "Amount requires manual review");
    }
}
