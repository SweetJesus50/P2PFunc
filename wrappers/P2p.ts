import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type P2pConfig = {};

export function p2pConfigToCell(config: P2pConfig): Cell {
    return beginCell().endCell();
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
}
