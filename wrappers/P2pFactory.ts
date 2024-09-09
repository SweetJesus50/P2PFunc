import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode, toNano } from '@ton/core';

export type ArbitratorConfig = {
    ownerAddress: Address,
    content: Cell,
    p2pCode: Cell,
    p2pJettonCode: Cell,
    moderators: Dictionary<Address, Boolean>
};

export function arbitratorConfigToCell(config: ArbitratorConfig): Cell {
    return beginCell()
                .storeAddress(config.ownerAddress)
                .storeUint(0, 64)
                .storeRef(config.content)
                .storeRef(config.p2pCode)
                .storeRef(config.p2pJettonCode)
                .storeDict(config.moderators, Dictionary.Keys.Address(), Dictionary.Values.Bool())
           .endCell();
}

export class Arbitrator implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Arbitrator(address);
    }

    static createFromConfig(config: ArbitratorConfig, code: Cell, workchain = 0) {
        const data = arbitratorConfigToCell(config);
        const init = { code, data };
        return new Arbitrator(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendAddModerator(provider: ContractProvider, via: Sender, newModerator: Address) {
        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(123, 64).storeAddress(newModerator).endCell()
        })
    }

    async sendRemoveModerator(provider: ContractProvider, via: Sender, removeModerator: Address) {
        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(123, 64).storeAddress(removeModerator).endCell()
        })
    }

    async sendChangeModeratorList(provider: ContractProvider, via: Sender, newModeratorList: Dictionary<Address, Boolean>) {
        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(123, 64).storeDict(newModeratorList, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell()
        })
    }

    async getOwnerAddress(provider: ContractProvider) {
        let { stack } = await provider.get('get_owner_address', []);

        return stack.readAddress()
    }

    async getIsModerator(provider: ContractProvider, moderatorAddress: Address) {
        let { stack } = await provider.get('get_is_moderator', [{type: 'slice', cell: beginCell().storeAddress(moderatorAddress).endCell()}]);

        return stack.readBoolean()
    }
}
