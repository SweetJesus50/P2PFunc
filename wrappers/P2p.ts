import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type P2pConfig = {
    arbitratorAddress: Address,
    lessorAddress: Address,
    renterAddress: Address,
    content: Cell,
    cost: bigint,
    arbitratorFeePercent: bigint,
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
                        .storeCoins(config.arbitratorFeePercent)
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

    async sendFinish(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0, 32).storeStringTail("Finish").endCell()
        })
    }

    async sendPayment(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0, 32).storeStringTail("Payment").endCell()
        })
    }

    async sendCancelRent(provider: ContractProvider, via: Sender, value: bigint, queryId?: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x34bae2ab, 32).storeUint(queryId! | 0, 64).endCell()
        })
    }

    async sendAbortRent(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0, 32).storeStringTail("Abort").endCell()
        })
    }

    async sendPauseRent(provider: ContractProvider, via: Sender, value: bigint, queryId?: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x92720da6, 32).storeUint(queryId! | 0, 64).endCell()
        })
    }

    async sendUnpauseRent(provider: ContractProvider, via: Sender, value: bigint, queryId?: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0xe30a304d, 32).storeUint(queryId! | 0, 64).endCell()
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

    async getCurrentPauseTime(provider: ContractProvider) {
        let { stack } = await provider.get('get_current_pause_time', [])

        return stack.readNumber()
    }

    async getIsPaused(provider: ContractProvider) {
        let { stack } = await provider.get('get_is_paused', [])

        return stack.readBoolean()
    }
}
