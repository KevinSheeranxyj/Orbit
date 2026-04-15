import { expect } from "chai";
import { ethers } from "hardhat";
import { PolicyRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PolicyRegistry", () => {
    let registry: PolicyRegistry;
    let owner: SignerWithAddress;
    let other: SignerWithAddress;
    let recipient: SignerWithAddress;

    const MAX_AUTO   = ethers.parseEther("0.01");  // 0.01 ETH
    const REVIEW_AT  = ethers.parseEther("0.1");   // 0.1  ETH

    beforeEach(async () => {
        [owner, other, recipient] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("PolicyRegistry");
        registry = await Factory.deploy();
    });

    // ── registerPolicy ────────────────────────────────────────────────────────

    describe("registerPolicy", () => {
        it("registers a policy and emits PolicyRegistered", async () => {
            await expect(
                registry.registerPolicy("Test Policy", MAX_AUTO, REVIEW_AT, false)
            ).to.emit(registry, "PolicyRegistered");
        });

        it("sets policy fields correctly", async () => {
            const tx = await registry.registerPolicy("My Policy", MAX_AUTO, REVIEW_AT, true);
            const receipt = await tx.wait();
            const event   = receipt!.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
            const policyId = (event as any).args.policyId;

            const p = await registry.getPolicy(policyId);
            expect(p.name).to.equal("My Policy");
            expect(p.maxAutoAmount).to.equal(MAX_AUTO);
            expect(p.requireManualReviewAbove).to.equal(REVIEW_AT);
            expect(p.requireWhitelist).to.be.true;
            expect(p.active).to.be.true;
            expect(p.owner).to.equal(owner.address);
        });

        it("reverts when maxAutoAmount > requireManualReviewAbove", async () => {
            await expect(
                registry.registerPolicy("Bad Policy", REVIEW_AT, MAX_AUTO, false)
            ).to.be.revertedWithCustomError(registry, "InvalidThresholds");
        });
    });

    // ── updatePolicy ──────────────────────────────────────────────────────────

    describe("updatePolicy", () => {
        let policyId: string;

        beforeEach(async () => {
            const tx      = await registry.registerPolicy("P", MAX_AUTO, REVIEW_AT, false);
            const receipt = await tx.wait();
            const event   = receipt!.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
            policyId = (event as any).args.policyId;
        });

        it("allows owner to update", async () => {
            const newMax = ethers.parseEther("0.05");
            await registry.updatePolicy(policyId, newMax, REVIEW_AT, true);
            const p = await registry.getPolicy(policyId);
            expect(p.maxAutoAmount).to.equal(newMax);
            expect(p.requireWhitelist).to.be.true;
        });

        it("reverts for non-owner", async () => {
            await expect(
                registry.connect(other).updatePolicy(policyId, MAX_AUTO, REVIEW_AT, false)
            ).to.be.revertedWithCustomError(registry, "NotPolicyOwner");
        });
    });

    // ── whitelist ─────────────────────────────────────────────────────────────

    describe("whitelist", () => {
        let policyId: string;

        beforeEach(async () => {
            const tx      = await registry.registerPolicy("W", MAX_AUTO, REVIEW_AT, true);
            const receipt = await tx.wait();
            const event   = receipt!.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
            policyId = (event as any).args.policyId;
        });

        it("adds and removes addresses", async () => {
            await registry.addToWhitelist(policyId, recipient.address);
            expect(await registry.isWhitelisted(policyId, recipient.address)).to.be.true;

            await registry.removeFromWhitelist(policyId, recipient.address);
            expect(await registry.isWhitelisted(policyId, recipient.address)).to.be.false;
        });

        it("rejects non-owner whitelist operations", async () => {
            await expect(
                registry.connect(other).addToWhitelist(policyId, recipient.address)
            ).to.be.revertedWithCustomError(registry, "NotPolicyOwner");
        });
    });

    // ── checkPolicy ───────────────────────────────────────────────────────────

    describe("checkPolicy", () => {
        let policyId: string;

        beforeEach(async () => {
            const tx      = await registry.registerPolicy("C", MAX_AUTO, REVIEW_AT, false);
            const receipt = await tx.wait();
            const event   = receipt!.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
            policyId = (event as any).args.policyId;
        });

        it("auto-approves amounts ≤ maxAutoAmount", async () => {
            const [auto, review] = await registry.checkPolicy(policyId, recipient.address, MAX_AUTO);
            expect(auto).to.be.true;
            expect(review).to.be.false;
        });

        it("requires review for amounts between thresholds", async () => {
            const mid = ethers.parseEther("0.05");
            const [auto, review] = await registry.checkPolicy(policyId, recipient.address, mid);
            expect(auto).to.be.false;
            expect(review).to.be.true;
        });

        it("requires review for amounts above review threshold", async () => {
            const big = ethers.parseEther("1");
            const [auto, review] = await registry.checkPolicy(policyId, recipient.address, big);
            expect(auto).to.be.false;
            expect(review).to.be.true;
        });

        it("requires review when recipient not whitelisted", async () => {
            // Register a whitelist policy
            const tx2 = await registry.registerPolicy("WL", MAX_AUTO, REVIEW_AT, true);
            const r2   = await tx2.wait();
            const ev2  = r2!.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
            const wlId = (ev2 as any).args.policyId;

            const [auto, review] = await registry.checkPolicy(wlId, recipient.address, MAX_AUTO);
            expect(auto).to.be.false;
            expect(review).to.be.true;
        });

        it("auto-approves whitelisted recipient", async () => {
            const tx2 = await registry.registerPolicy("WL2", MAX_AUTO, REVIEW_AT, true);
            const r2   = await tx2.wait();
            const ev2  = r2!.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
            const wlId = (ev2 as any).args.policyId;

            await registry.addToWhitelist(wlId, recipient.address);
            const [auto] = await registry.checkPolicy(wlId, recipient.address, MAX_AUTO);
            expect(auto).to.be.true;
        });

        it("rejects when policy inactive", async () => {
            await registry.setActive(policyId, false);
            const [auto, review] = await registry.checkPolicy(policyId, recipient.address, MAX_AUTO);
            expect(auto).to.be.false;
            expect(review).to.be.false;
        });
    });
});
