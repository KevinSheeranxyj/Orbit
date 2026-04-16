import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

// 0G Newton Testnet
export const zgTestnet = defineChain({
    id: 16600,
    name: "0G Newton Testnet",
    nativeCurrency: {
        name: "0G",
        symbol: "OG",
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ["https://evmrpc-testnet.0g.ai"] },
    },
    blockExplorers: {
        default: {
            name: "0G Explorer",
            url: "https://chainscan-newton.0g.ai",
        },
    },
    testnet: true,
});

// Brave wallet injects itself as window.ethereum; the injected() connector picks it up automatically.
// It also provides window.brave.ethereum, which we target explicitly as a fallback.
export const wagmiConfig = createConfig({
    chains: [zgTestnet],
    connectors: [
        injected({ target: "metaMask" }), // catches Brave when it's acting as the default injected wallet
        injected({
            target() {
                return {
                    id: "braveWallet",
                    name: "Brave Wallet",
                    provider:
                        typeof window !== "undefined"
                            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              (window as any).brave?.ethereum ??
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              (window as any).ethereum
                            : undefined,
                };
            },
        }),
    ],
    transports: {
        [zgTestnet.id]: http(),
    },
});
