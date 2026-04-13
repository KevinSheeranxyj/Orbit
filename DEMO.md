## Demo Scenario

### Demo 1: Auto-approved payment

-   user submits a 50 USDC request to a whitelisted address
-	policy says requests below 100 USDC can auto-execute
-	agent returns low risk
-	evidence bundle is stored
-	onchain receipt is created
-	payment is executed


### Demo 2: Manual approval required

-	user submits a 1000 USDC request
-	policy marks it as above threshold
-	agent returns review required
-	evidence bundle is stored
-	receipt is created with pending status
-	reviewer approves
-	payment executes
-	final receipt is recorded

## What makes Orbit different

Most agent tools focus on reasoning.
Orbit focuses on execution trust.

Orbit adds:

-	policy gating
-	evidence standardization
-	onchain receipt generation
-	0G-native storage for execution history