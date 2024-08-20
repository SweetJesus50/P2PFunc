import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type P2pConfig = {
    arbitratorAddress: Address,
    lessorAddress: Address,
    renterAddress: Address,
    content: Cell,
    cost: bigint,
    arbitratorFeePercent: number,
    rentTime: number
};

export function p2pConfigToCell(config: P2pConfig): Cell {
    return beginCell()
                .storeAddress(config.arbitratorAddress)
                .storeAddress(config.lessorAddress)
                .storeAddress(config.renterAddress)
                .storeRef(config.content)
                .storeRef(
                    beginCell()
                        .storeCoins(config.cost)
                        .storeUint(config.arbitratorFeePercent, 32)
                        .storeUint(config.rentTime, 32)
                    .endCell()
                )
            .endCell();
}

export class P2p implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new P2p(address);
    }

    static createFromConfig(config: P2pConfig, code: Cell, workchain = 0) {
        const data = p2pConfigToCell(config);
        const init = { code, data };
        return new P2p(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeposit(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0, 32).storeStringTail("Deposit").endCell()
        })
    }
}
