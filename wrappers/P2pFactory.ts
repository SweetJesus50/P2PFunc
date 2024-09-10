import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Dictionary, Sender, SendMode, toNano } from '@ton/core';

export type P2pFactoryConfig = {
    ownerAddress: Address,
    content: Cell,
    p2pCode: Cell,
    p2pJettonCode: Cell,
    moderators: Dictionary<Address, Boolean>
};

export function p2pFactoryConfigToCell(config: P2pFactoryConfig): Cell {
    return beginCell()
                .storeAddress(config.ownerAddress)
                .storeUint(0, 64)
                .storeRef(config.content)
                .storeRef(config.p2pCode)
                .storeRef(config.p2pJettonCode)
                .storeDict(config.moderators, Dictionary.Keys.Address(), Dictionary.Values.Bool())
           .endCell();
}

export class P2PFactory implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new P2PFactory(address);
    }

    static createFromConfig(config: P2pFactoryConfig, code: Cell, workchain = 0) {
        const data = p2pFactoryConfigToCell(config);
        const init = { code, data };
        return new P2PFactory(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    static buildInnerCell(arbitrator: Address, lessor: Address, renter: Address): Cell {
        return beginCell().storeAddress(arbitrator).storeAddress(lessor).storeAddress(renter).endCell()
    }

    async sendDeployP2P(provider: ContractProvider, via: Sender, value: bigint, opts: {
        queryId: number,
        itemIndex: number,
        forwardTonAmount: bigint,
        content: Cell,
        arbitrator: Address,
        lessor: Address,
        renter: Address,
        depositSize: bigint,
        cost: bigint,
        arbitratorPercent: bigint,
        rentTime: number
    }) {
        await provider.internal(via, {
            value: value + opts.forwardTonAmount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(0xbabed24e, 32)
                    .storeUint(opts.queryId, 64)
                    .storeUint(opts.itemIndex, 64)
                    .storeCoins(opts.forwardTonAmount)
                    .storeCoins(opts.depositSize)
                    .storeCoins(opts.cost)
                    .storeCoins(opts.arbitratorPercent)
                    .storeUint(opts.rentTime, 32)
                    .storeRef(opts.content)
                    .storeRef(P2PFactory.buildInnerCell(opts.arbitrator, opts.lessor, opts.renter))
                  .endCell()
        })
    }

    async sendDeployP2PJetton(provider: ContractProvider, via: Sender, value: bigint, opts: {
        queryId: number,
        itemIndex: number,
        forwardTonAmount: bigint,
        content: Cell,
        arbitrator: Address,
        lessor: Address,
        renter: Address,
        jettonMasterAddress: Address,
        depositSize: bigint,
        cost: bigint,
        arbitratorPercent: bigint,
        rentTime: number
    }) {
        await provider.internal(via, {
            value: value + opts.forwardTonAmount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(0xd97cf5da, 32)
                    .storeUint(opts.queryId, 64)
                    .storeUint(opts.itemIndex, 64)
                    .storeCoins(opts.forwardTonAmount)
                    .storeAddress(opts.jettonMasterAddress)
                    .storeCoins(opts.depositSize)
                    .storeCoins(opts.cost)
                    .storeCoins(opts.arbitratorPercent)
                    .storeUint(opts.rentTime, 32)
                    .storeRef(opts.content)
                    .storeRef(P2PFactory.buildInnerCell(opts.arbitrator, opts.lessor, opts.renter))
                  .endCell()
        })
    }

    async sendAddModerator(provider: ContractProvider, via: Sender, newModerator: Address, queryId: number) {
        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(queryId, 64).storeAddress(newModerator).endCell()
        })
    }

    async sendRemoveModerator(provider: ContractProvider, via: Sender, removeModerator: Address, queryId: number) {
        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(queryId, 64).storeAddress(removeModerator).endCell()
        })
    }

    async sendChangeModeratorList(provider: ContractProvider, via: Sender, queryId: number, newModeratorList: Dictionary<Address, Boolean>) {
        await provider.internal(via, {
            value: toNano('0.01'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(queryId, 64).storeDict(newModeratorList, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell()
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
