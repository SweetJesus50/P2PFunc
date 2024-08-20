import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type P2PConfig = {};

export function p2PConfigToCell(config: P2PConfig): Cell {
    return beginCell().endCell();
}

export class P2P implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new P2P(address);
    }

    static createFromConfig(config: P2PConfig, code: Cell, workchain = 0) {
        const data = p2PConfigToCell(config);
        const init = { code, data };
        return new P2P(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
