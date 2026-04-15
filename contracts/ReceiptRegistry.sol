// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReceiptRegistry
 * @notice Immutable on-chain ledger of Orbit execution receipts.
 *
 * Every action processed by GuardedExecutor produces a receipt here.
 * Receipts reference an evidence bundle stored off-chain in 0G Storage
 * via a content-addressed hash (evidenceHash) and a storage URI (storageRef).
 *
 * Only authorized executors (e.g. GuardedExecutor) can create or update receipts.
 * The contract owner manages executor authorization.
 */
contract ReceiptRegistry {
    // ─── Types ───────────────────────────────────────────────────────────────

    enum ReceiptStatus { Pending, Confirmed, Failed }

    struct Receipt {
        bytes32       id;
        bytes32       requestId;
        bytes32       evidenceHash;  // keccak256 of the evidence bundle
        bytes32       txHash;        // populated on-chain confirmation
        ReceiptStatus status;
        address       executor;      // GuardedExecutor that created this receipt
        address       submitter;     // original request submitter
        uint256       amount;
        address       token;         // address(0) = native ETH
        address       recipient;
        uint256       createdAt;
        uint256       confirmedAt;
        string        storageRef;    // 0G Storage URI for the evidence bundle
        string        failReason;    // populated on failure
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    address public owner;
    uint256 private _receiptCount;

    /// receiptId → Receipt
    mapping(bytes32 => Receipt) private _receipts;

    /// requestId → receiptId  (one request = one receipt)
    mapping(bytes32 => bytes32) public requestToReceipt;

    /// authorized executors
    mapping(address => bool) public authorizedExecutors;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ReceiptCreated(
        bytes32 indexed receiptId,
        bytes32 indexed requestId,
        address indexed submitter,
        uint256 amount,
        address token,
        address recipient
    );
    event ReceiptConfirmed(bytes32 indexed receiptId, bytes32 txHash);
    event ReceiptFailed(bytes32 indexed receiptId, string reason);
    event ExecutorAuthorized(address indexed executor);
    event ExecutorRevoked(address indexed executor);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error Unauthorized();
    error ReceiptNotFound(bytes32 receiptId);
    error ReceiptAlreadyFinalized(bytes32 receiptId);
    error RequestAlreadyHasReceipt(bytes32 requestId);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyExecutor() {
        if (!authorizedExecutors[msg.sender]) revert Unauthorized();
        _;
    }

    // ─── Owner: Authorization ─────────────────────────────────────────────────

    function authorizeExecutor(address executor) external onlyOwner {
        authorizedExecutors[executor] = true;
        emit ExecutorAuthorized(executor);
    }

    function revokeExecutor(address executor) external onlyOwner {
        authorizedExecutors[executor] = false;
        emit ExecutorRevoked(executor);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        address old = owner;
        owner = newOwner;
        emit OwnershipTransferred(old, newOwner);
    }

    // ─── Executor: Write ──────────────────────────────────────────────────────

    /**
     * @notice Create a new pending receipt for a submitted request.
     * @return receiptId Unique identifier for the receipt.
     */
    function createReceipt(
        bytes32 requestId,
        bytes32 evidenceHash,
        address submitter,
        uint256 amount,
        address token,
        address recipient,
        string  calldata storageRef
    ) external onlyExecutor returns (bytes32 receiptId) {
        if (requestToReceipt[requestId] != bytes32(0))
            revert RequestAlreadyHasReceipt(requestId);

        receiptId = keccak256(
            abi.encodePacked(requestId, _receiptCount++, block.timestamp)
        );

        _receipts[receiptId] = Receipt({
            id:           receiptId,
            requestId:    requestId,
            evidenceHash: evidenceHash,
            txHash:       bytes32(0),
            status:       ReceiptStatus.Pending,
            executor:     msg.sender,
            submitter:    submitter,
            amount:       amount,
            token:        token,
            recipient:    recipient,
            createdAt:    block.timestamp,
            confirmedAt:  0,
            storageRef:   storageRef,
            failReason:   ""
        });

        requestToReceipt[requestId] = receiptId;

        emit ReceiptCreated(receiptId, requestId, submitter, amount, token, recipient);
    }

    /**
     * @notice Mark a receipt as confirmed once the on-chain action has settled.
     * @param txHash The transaction hash of the executed action.
     */
    function confirmReceipt(bytes32 receiptId, bytes32 txHash)
        external
        onlyExecutor
    {
        Receipt storage r = _receipts[receiptId];
        if (r.id == bytes32(0)) revert ReceiptNotFound(receiptId);
        if (r.status != ReceiptStatus.Pending)
            revert ReceiptAlreadyFinalized(receiptId);

        r.status      = ReceiptStatus.Confirmed;
        r.txHash      = txHash;
        r.confirmedAt = block.timestamp;

        emit ReceiptConfirmed(receiptId, txHash);
    }

    /**
     * @notice Mark a receipt as failed with a reason string.
     */
    function failReceipt(bytes32 receiptId, string calldata reason)
        external
        onlyExecutor
    {
        Receipt storage r = _receipts[receiptId];
        if (r.id == bytes32(0)) revert ReceiptNotFound(receiptId);
        if (r.status != ReceiptStatus.Pending)
            revert ReceiptAlreadyFinalized(receiptId);

        r.status     = ReceiptStatus.Failed;
        r.failReason = reason;

        emit ReceiptFailed(receiptId, reason);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    function getReceipt(bytes32 receiptId)
        external view returns (Receipt memory)
    {
        return _receipts[receiptId];
    }

    function getReceiptByRequest(bytes32 requestId)
        external view returns (Receipt memory)
    {
        return _receipts[requestToReceipt[requestId]];
    }
}
