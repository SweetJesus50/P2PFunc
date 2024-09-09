import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type P2PJettonConfig = {};

export function p2PJettonConfigToCell(config: P2PJettonConfig): Cell {
    return beginCell().endCell();
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
