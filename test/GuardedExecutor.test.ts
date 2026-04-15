import { expect } from "chai";
import { ethers } from "hardhat";
import { GuardedExecutor, PolicyRegistry, ReceiptRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("GuardedExecutor", () => {
    let executor: GuardedExecutor;
    let policyReg: PolicyRegistry;
    let receiptReg: ReceiptRegistry;

    let owner: SignerWithAddress;
    let reviewer: SignerWithAddress;
    let submitter: SignerWithAddress;
    let recipient: SignerWithAddress;

    const MAX_AUTO  = ethers.parseEther("0.01");
    const REVIEW_AT = ethers.parseEther("0.1");

    const EVIDENCE_HASH = ethers.keccak256(ethers.toUtf8Bytes("evidence-bundle-v1"));
    const STORAGE_REF   = "0g://bafkreiexamplehash";
    const MEMO          = "Test payment";

    let policyId: string;

    beforeEach(async () => {
        [owner, reviewer, submitter, recipient] = await ethers.getSigners();

        // Deploy all three contracts
        policyReg  = await (await ethers.getContractFactory("PolicyRegistry")).deploy();
        receiptReg = await (await ethers.getContractFactory("ReceiptRegistry")).deploy();
        executor   = await (await ethers.getContractFactory("GuardedExecutor")).deploy(
            await policyReg.getAddress(),
            await receiptReg.getAddress()
        );

        // Register a demo policy
        const tx      = await policyReg.registerPolicy("Demo", MAX_AUTO, REVIEW_AT, false);
        const receipt = await tx.wait();
        const event   = receipt!.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
        policyId = (event as any).args.policyId;

        // Fund the executor with ETH for outbound transfers
        await owner.sendTransaction({
            to: await executor.getAddress(),
            value: ethers.parseEther("1"),
        });

        // Add reviewer
        await executor.addReviewer(reviewer.address);
    });

    // ── submitRequest: auto-approve ───────────────────────────────────────────

    describe("auto-approved request (low risk)", () => {
        it("emits RequestSubmitted and RequestExecuted", async () => {
            const amount = ethers.parseEther("0.005"); // below MAX_AUTO

            await expect(
                executor.connect(submitter).submitRequest(
                    policyId, amount, ethers.ZeroAddress,
                    recipient.address, EVIDENCE_HASH, STORAGE_REF, MEMO
                )
            )
                .to.emit(executor, "RequestSubmitted")
                .to.emit(executor, "RequestExecuted");
        });

        it("transfers ETH to recipient", async () => {
            const amount = ethers.parseEther("0.005");
            const before = await ethers.provider.getBalance(recipient.address);

            await executor.connect(submitter).submitRequest(
                policyId, amount, ethers.ZeroAddress,
                recipient.address, EVIDENCE_HASH, STORAGE_REF, MEMO
            );

            const after = await ethers.provider.getBalance(recipient.address);
            expect(after - before).to.equal(amount);
        });

        it("creates a confirmed receipt", async () => {
            const amount = ethers.parseEther("0.005");
            const tx     = await executor.connect(submitter).submitRequest(
                policyId, amount, ethers.ZeroAddress,
                recipient.address, EVIDENCE_HASH, STORAGE_REF, MEMO
            );
            const txReceipt = await tx.wait();
            const subEvent  = txReceipt!.logs.find((l: any) => l.fragment?.name === "RequestSubmitted");
            const requestId = (subEvent as any).args.requestId;

            const req = await executor.getRequest(requestId);
            expect(req.status).to.equal(4); // Executed

            const onchainReceipt = await receiptReg.getReceiptByRequest(requestId);
            expect(onchainReceipt.status).to.equal(1); // Confirmed
        });
    });

    // ── submitRequest: review required ────────────────────────────────────────

    describe("review-required request (high risk)", () => {
        let requestId: string;
        const amount = ethers.parseEther("0.05"); // between thresholds

        beforeEach(async () => {
            const tx = await executor.connect(submitter).submitRequest(
                policyId, amount, ethers.ZeroAddress,
                recipient.address, EVIDENCE_HASH, STORAGE_REF, MEMO
            );
            const txReceipt = await tx.wait();
            const event     = txReceipt!.logs.find((l: any) => l.fragment?.name === "RequestSubmitted");
            requestId = (event as any).args.requestId;
        });

        it("sets status to ReviewRequired", async () => {
            const req = await executor.getRequest(requestId);
            expect(req.status).to.equal(1); // ReviewRequired
        });

        it("reviewer can approve and execute", async () => {
            const before = await ethers.provider.getBalance(recipient.address);

            await expect(executor.connect(reviewer).approveRequest(requestId))
                .to.emit(executor, "RequestApproved")
                .to.emit(executor, "RequestExecuted");

            const after = await ethers.provider.getBalance(recipient.address);
            expect(after - before).to.equal(amount);

            const req = await executor.getRequest(requestId);
            expect(req.status).to.equal(4); // Executed
        });

        it("reviewer can reject", async () => {
            await expect(
                executor.connect(reviewer).rejectRequest(requestId, "Policy violation")
            ).to.emit(executor, "RequestRejected");

            const req = await executor.getRequest(requestId);
            expect(req.status).to.equal(3); // Rejected

            const receipt = await receiptReg.getReceiptByRequest(requestId);
            expect(receipt.status).to.equal(2); // Failed
        });

        it("non-reviewer cannot approve", async () => {
            await expect(
                executor.connect(submitter).approveRequest(requestId)
            ).to.be.revertedWithCustomError(executor, "Unauthorized");
        });

        it("cannot approve an already-executed request", async () => {
            await executor.connect(reviewer).approveRequest(requestId);
            await expect(
                executor.connect(reviewer).approveRequest(requestId)
            ).to.be.revertedWithCustomError(executor, "InvalidRequestStatus");
        });
    });

    // ── Edge cases ────────────────────────────────────────────────────────────

    describe("edge cases", () => {
        it("reverts on zero amount", async () => {
            await expect(
                executor.connect(submitter).submitRequest(
                    policyId, 0, ethers.ZeroAddress,
                    recipient.address, EVIDENCE_HASH, STORAGE_REF, MEMO
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAmount");
        });

        it("reverts on zero recipient", async () => {
            await expect(
                executor.connect(submitter).submitRequest(
                    policyId, MAX_AUTO, ethers.ZeroAddress,
                    ethers.ZeroAddress, EVIDENCE_HASH, STORAGE_REF, MEMO
                )
            ).to.be.revertedWithCustomError(executor, "ZeroAddress");
        });

        it("reverts when policy is inactive", async () => {
            await policyReg.setActive(policyId, false);
            await expect(
                executor.connect(submitter).submitRequest(
                    policyId, MAX_AUTO, ethers.ZeroAddress,
                    recipient.address, EVIDENCE_HASH, STORAGE_REF, MEMO
                )
            ).to.be.revertedWithCustomError(executor, "PolicyRejected");
        });

        it("reviewer management works", async () => {
            await executor.removeReviewer(reviewer.address);
            const amount = ethers.parseEther("0.05");
            const tx = await executor.connect(submitter).submitRequest(
                policyId, amount, ethers.ZeroAddress,
                recipient.address, EVIDENCE_HASH, STORAGE_REF, MEMO
            );
            const txR = await tx.wait();
            const ev  = txR!.logs.find((l: any) => l.fragment?.name === "RequestSubmitted");
            const reqId = (ev as any).args.requestId;

            await expect(
                executor.connect(reviewer).approveRequest(reqId)
            ).to.be.revertedWithCustomError(executor, "Unauthorized");
        });
    });
});
