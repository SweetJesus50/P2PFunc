import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type P2PJettonConfig = {
    arbitratorAddress: Address,
    lessorAddress: Address,
    renterAddress: Address,
    content: Cell,
    depositSize: bigint,
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
                beginCell()
                    .storeUint(0, 2)
                    .storeCoins(config.depositSize)
                .endCell()
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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, jettonAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x95973dcc, 32).storeUint(0, 64).storeAddress(jettonAddress).endCell(),
        });
    }

    async sendSetJettonWallet(provider: ContractProvider, via: Sender, value: bigint, jettonWallet: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x70eecd6f, 32).storeUint(0, 64).storeAddress(jettonWallet).endCell()
        })
    }

    async getStorage(provider: ContractProvider) {
        let { stack } = await provider.get('get_storage', [])

        return {
            init: stack.readBoolean(),
            arbitratorAddr: stack.readAddress(),
            lessorAddr: stack.readAddress(),
            renterAddr: stack.readAddress(),
            content: stack.readCell(),
            depositSize: stack.readBigNumber(),
            cost: stack.readBigNumber(),
            arbitratorFee: stack.readBigNumber(),
            deposit: stack.readBigNumber(),
            rentTime: stack.readNumber(),
            delayTime: stack.readNumber(),
            rentEndTime: stack.readNumber(),
            request: stack.readBoolean(),
            ended: stack.readBoolean(),
            pauseTimestamp: stack.readNumber(),
            pauseAttemtps: stack.readNumber()
        }
    }


    async getJettonWalletAddress(provider: ContractProvider) {
        let { stack } = await provider.get('get_jetton_wallet_address', [])

        return stack.readAddress()
    }
}
