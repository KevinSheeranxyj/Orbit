import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log(
        "Balance:",
        ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
        "ETH"
    );

    // ── 1. Deploy PolicyRegistry ─────────────────────────────────────────────
    console.log("\n[1/3] Deploying PolicyRegistry...");
    const PolicyRegistry = await ethers.getContractFactory("PolicyRegistry");
    const policyRegistry = await PolicyRegistry.deploy();
    await policyRegistry.waitForDeployment();
    const prAddr = await policyRegistry.getAddress();
    console.log("  PolicyRegistry →", prAddr);

    // ── 2. Deploy ReceiptRegistry ────────────────────────────────────────────
    console.log("[2/3] Deploying ReceiptRegistry...");
    const ReceiptRegistry = await ethers.getContractFactory("ReceiptRegistry");
    const receiptRegistry = await ReceiptRegistry.deploy();
    await receiptRegistry.waitForDeployment();
    const rrAddr = await receiptRegistry.getAddress();
    console.log("  ReceiptRegistry →", rrAddr);

    // ── 3. Deploy GuardedExecutor ────────────────────────────────────────────
    console.log("[3/3] Deploying GuardedExecutor...");
    const GuardedExecutor = await ethers.getContractFactory("GuardedExecutor");
    const guardedExecutor = await GuardedExecutor.deploy(prAddr, rrAddr);
    await guardedExecutor.waitForDeployment();
    const geAddr = await guardedExecutor.getAddress();
    console.log("  GuardedExecutor →", geAddr);

    // ── 4. Authorize GuardedExecutor to write receipts ───────────────────────
    console.log("[Setup] Authorizing GuardedExecutor on ReceiptRegistry...");
    await (await receiptRegistry.authorizeExecutor(geAddr)).wait();
    console.log("  Authorized.");

    // ── Seed demo policy ─────────────────────────────────────────────────────
    console.log("\n[Setup] Registering demo policy...");
    const tx = await policyRegistry.registerPolicy(
        "Treasury Payments",
        ethers.parseEther("0.01"),   // auto-approve ≤ 0.01 ETH
        ethers.parseEther("0.1"),    // manual review > 0.1 ETH
        false                        // no whitelist required
    );
    const receipt = await tx.wait();
    const event = receipt?.logs.find((l: any) => l.fragment?.name === "PolicyRegistered");
    const policyId = (event as any)?.args?.policyId ?? "—";
    console.log("  Demo policy ID:", policyId);

    // ── Print summary ─────────────────────────────────────────────────────────
    console.log("\n─────────────────────────────────────────────────────");
    console.log("Deployment complete");
    console.log("─────────────────────────────────────────────────────");
    console.log("PolicyRegistry:  ", prAddr);
    console.log("ReceiptRegistry: ", rrAddr);
    console.log("GuardedExecutor: ", geAddr);
    console.log("Demo Policy ID:  ", policyId);
    console.log("─────────────────────────────────────────────────────");
    console.log("\nAdd these to frontend/orbit/.env.local:");
    console.log(`NEXT_PUBLIC_POLICY_REGISTRY_ADDRESS=${prAddr}`);
    console.log(`NEXT_PUBLIC_RECEIPT_REGISTRY_ADDRESS=${rrAddr}`);
    console.log(`NEXT_PUBLIC_GUARDED_EXECUTOR_ADDRESS=${geAddr}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
