// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { PolicyRegistry }  from "./PolicyRegistry.sol";
import { ReceiptRegistry }  from "./ReceiptRegistry.sol";

/**
 * @title GuardedExecutor
 * @notice Core execution middleware for Orbit.
 *
 * Sits between the agent runtime and the final action layer.
 * For every incoming request it:
 *   1. Consults PolicyRegistry to determine risk tier
 *   2. Creates an on-chain receipt in ReceiptRegistry
 *   3a. If auto-approved  → executes immediately
 *   3b. If review needed  → pauses for a reviewer to approve or reject
 *
 * Supported action types:
 *   - Native ETH transfers  (token == address(0))
 *   - ERC-20 token transfers (token = ERC-20 contract address)
 *     The contract must have sufficient allowance from the treasury wallet.
 *
 * Evidence bundles are stored in 0G Storage off-chain; only their
 * keccak256 hash and a storage URI are written on-chain.
 */
contract GuardedExecutor {
    // ─── Types ───────────────────────────────────────────────────────────────

    enum RequestStatus {
        Pending,
        ReviewRequired,
        Approved,
        Rejected,
        Executed,
        Failed
    }

    struct Request {
        bytes32       id;
        bytes32       policyId;
        address       submitter;
        address       recipient;
        uint256       amount;
        address       token;         // address(0) = native ETH
        bytes32       evidenceHash;  // keccak256 of evidence bundle
        string        storageRef;    // 0G Storage URI
        string        memo;
        RequestStatus status;
        bytes32       receiptId;
        uint256       createdAt;
        uint256       resolvedAt;
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    address public owner;
    PolicyRegistry  public policyRegistry;
    ReceiptRegistry public receiptRegistry;

    uint256 private _requestCount;

    mapping(bytes32 => Request) private _requests;
    mapping(address => bool)    public  reviewers;

    // ─── Events ───────────────────────────────────────────────────────────────

    event RequestSubmitted(
        bytes32 indexed requestId,
        bytes32 indexed policyId,
        address indexed submitter,
        address  recipient,
        uint256  amount,
        address  token,
        RequestStatus status
    );
    event RequestApproved(bytes32 indexed requestId, address indexed reviewer);
    event RequestRejected(bytes32 indexed requestId, address indexed reviewer, string reason);
    event RequestExecuted(bytes32 indexed requestId, bytes32 receiptId);
    event RequestFailed(bytes32 indexed requestId, string reason);

    event ReviewerAdded(address indexed reviewer);
    event ReviewerRemoved(address indexed reviewer);
    event FundsReceived(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Unauthorized();
    error RequestNotFound(bytes32 requestId);
    error InvalidRequestStatus(bytes32 requestId, RequestStatus current);
    error PolicyRejected(string reason);
    error TransferFailed(address recipient, uint256 amount);
    error InsufficientBalance(uint256 required, uint256 available);
    error ZeroAmount();
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _policyRegistry, address _receiptRegistry) {
        if (_policyRegistry  == address(0)) revert ZeroAddress();
        if (_receiptRegistry == address(0)) revert ZeroAddress();

        owner           = msg.sender;
        policyRegistry  = PolicyRegistry(_policyRegistry);
        receiptRegistry = ReceiptRegistry(_receiptRegistry);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyReviewer() {
        if (!reviewers[msg.sender] && msg.sender != owner) revert Unauthorized();
        _;
    }

    // ─── Reviewer management ──────────────────────────────────────────────────

    function addReviewer(address reviewer) external onlyOwner {
        if (reviewer == address(0)) revert ZeroAddress();
        reviewers[reviewer] = true;
        emit ReviewerAdded(reviewer);
    }

    function removeReviewer(address reviewer) external onlyOwner {
        reviewers[reviewer] = false;
        emit ReviewerRemoved(reviewer);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address old = owner;
        owner = newOwner;
        emit OwnershipTransferred(old, newOwner);
    }

    // ─── Fund the contract (ETH treasury) ────────────────────────────────────

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // ─── Core: Submit ─────────────────────────────────────────────────────────

    /**
     * @notice Submit an agent action request.
     *
     * @param policyId      ID of the policy to evaluate against.
     * @param amount        Token amount in base units.
     * @param token         ERC-20 address, or address(0) for native ETH.
     * @param recipient     Destination address.
     * @param evidenceHash  keccak256 hash of the off-chain evidence bundle.
     * @param storageRef    0G Storage URI pointing to the evidence bundle.
     * @param memo          Optional human-readable note.
     *
     * @return requestId    Unique ID for tracking this request.
     */
    function submitRequest(
        bytes32       policyId,
        uint256       amount,
        address       token,
        address       recipient,
        bytes32       evidenceHash,
        string calldata storageRef,
        string calldata memo
    ) external returns (bytes32 requestId) {
        if (amount    == 0)            revert ZeroAmount();
        if (recipient == address(0))   revert ZeroAddress();

        // ── 1. Policy evaluation ──────────────────────────────────────────────
        (bool autoApprove, bool requiresReview, string memory reason) =
            policyRegistry.checkPolicy(policyId, recipient, amount);

        if (!autoApprove && !requiresReview)
            revert PolicyRejected(reason);

        // ── 2. Derive request ID ──────────────────────────────────────────────
        requestId = keccak256(
            abi.encodePacked(msg.sender, _requestCount++, block.timestamp)
        );

        RequestStatus initialStatus = autoApprove
            ? RequestStatus.Pending        // will execute immediately below
            : RequestStatus.ReviewRequired;

        // ── 3. Persist request ────────────────────────────────────────────────
        _requests[requestId] = Request({
            id:           requestId,
            policyId:     policyId,
            submitter:    msg.sender,
            recipient:    recipient,
            amount:       amount,
            token:        token,
            evidenceHash: evidenceHash,
            storageRef:   storageRef,
            memo:         memo,
            status:       initialStatus,
            receiptId:    bytes32(0),
            createdAt:    block.timestamp,
            resolvedAt:   0
        });

        // ── 4. Create pending receipt ─────────────────────────────────────────
        bytes32 receiptId = receiptRegistry.createReceipt(
            requestId,
            evidenceHash,
            msg.sender,
            amount,
            token,
            recipient,
            storageRef
        );
        _requests[requestId].receiptId = receiptId;

        emit RequestSubmitted(
            requestId, policyId, msg.sender,
            recipient, amount, token, initialStatus
        );

        // ── 5. Auto-execute if policy allows ──────────────────────────────────
        if (autoApprove) {
            _execute(requestId);
        }
    }

    // ─── Core: Review ─────────────────────────────────────────────────────────

    /**
     * @notice Approve a request that is waiting for manual review.
     *         Execution happens immediately after approval.
     */
    function approveRequest(bytes32 requestId)
        external
        onlyReviewer
    {
        Request storage req = _requests[requestId];
        if (req.id == bytes32(0))
            revert RequestNotFound(requestId);
        if (req.status != RequestStatus.ReviewRequired)
            revert InvalidRequestStatus(requestId, req.status);

        req.status = RequestStatus.Approved;
        emit RequestApproved(requestId, msg.sender);

        _execute(requestId);
    }

    /**
     * @notice Reject a request that is waiting for manual review.
     */
    function rejectRequest(bytes32 requestId, string calldata reason)
        external
        onlyReviewer
    {
        Request storage req = _requests[requestId];
        if (req.id == bytes32(0))
            revert RequestNotFound(requestId);
        if (req.status != RequestStatus.ReviewRequired)
            revert InvalidRequestStatus(requestId, req.status);

        req.status     = RequestStatus.Rejected;
        req.resolvedAt = block.timestamp;

        receiptRegistry.failReceipt(req.receiptId, reason);

        emit RequestRejected(requestId, msg.sender, reason);
    }

    // ─── Internal: Execute ────────────────────────────────────────────────────

    /**
     * @dev Perform the actual transfer and update statuses.
     *      Uses Checks-Effects-Interactions pattern.
     */
    function _execute(bytes32 requestId) internal {
        Request storage req = _requests[requestId];

        // ── Effects ───────────────────────────────────────────────────────────
        req.status     = RequestStatus.Executed;
        req.resolvedAt = block.timestamp;

        bytes32 receiptId = req.receiptId;
        uint256 amount    = req.amount;
        address token     = req.token;
        address recipient = req.recipient;

        // ── Interactions ──────────────────────────────────────────────────────
        if (token == address(0)) {
            // Native ETH transfer
            if (address(this).balance < amount)
                revert InsufficientBalance(amount, address(this).balance);

            (bool ok, ) = recipient.call{ value: amount }("");
            if (!ok) {
                // Roll back status and mark as failed
                req.status = RequestStatus.Failed;
                receiptRegistry.failReceipt(receiptId, "ETH transfer failed");
                emit RequestFailed(requestId, "ETH transfer failed");
                return;
            }
        } else {
            // ERC-20 transfer via low-level call to avoid import dependency
            // Equivalent to: IERC20(token).transferFrom(owner, recipient, amount)
            bytes memory data = abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                owner,
                recipient,
                amount
            );
            (bool ok, bytes memory result) = token.call(data);
            bool transferred = ok && (result.length == 0 || abi.decode(result, (bool)));

            if (!transferred) {
                req.status = RequestStatus.Failed;
                receiptRegistry.failReceipt(receiptId, "ERC-20 transfer failed");
                emit RequestFailed(requestId, "ERC-20 transfer failed");
                return;
            }
        }

        // Confirm the receipt (use tx hash placeholder — frontend can update via events)
        receiptRegistry.confirmReceipt(
            receiptId,
            bytes32(uint256(uint160(recipient)) ^ uint256(amount) ^ block.timestamp)
        );

        emit RequestExecuted(requestId, receiptId);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    function getRequest(bytes32 requestId)
        external view returns (Request memory)
    {
        return _requests[requestId];
    }

    function ethBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
