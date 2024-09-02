import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type P2PJettonConfig = {
    arbitratorAddress: Address,
    lessorAddress: Address,
    renterAddress: Address,
    content: Cell,
    jettonWalletAddress: Address,
    cost: bigint,
    arbitratorFeePercent: bigint,
    rentTime: number
};

export function p2PJettonConfigToCell(config: P2PJettonConfig): Cell {
    return beginCell()
            .storeAddress(config.arbitratorAddress)
            .storeAddress(config.lessorAddress)
            .storeAddress(config.renterAddress)
            .storeRef(config.content)
            .storeRef(
                beginCell().storeAddress(config.jettonWalletAddress).endCell()
            )
            .storeRef(
                beginCell()
                    .storeCoins(config.cost)
                    .storeCoins(config.arbitratorFeePercent)
                    .storeUint(config.rentTime, 32)
                .endCell()
            )
        .endCell();
}

export class P2PJetton implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new P2PJetton(address);
    }

    static createFromConfig(config: P2PJettonConfig, code: Cell, workchain = 0) {
        const data = p2PJettonConfigToCell(config);
        const init = { code, data };
        return new P2PJetton(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
