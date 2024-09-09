import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { Maybe } from '@ton/ton/dist/utils/maybe';

export type JettonWalletConfig = {
    owner: Address,
    master: Address,
    walletCode: Cell
};

export function jettonWalletConfigToCell(config: JettonWalletConfig): Cell {
    return beginCell()
                .storeCoins(0)
                .storeAddress(config.owner)
                .storeAddress(config.master)
                .storeRef(config.walletCode)
            .endCell();
}

export class JettonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    static createFromConfig(config: JettonWalletConfig, code: Cell, workchain = 0) {
        const data = jettonWalletConfigToCell(config);
        const init = { code, data };
        return new JettonWallet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(provider: ContractProvider, via: Sender, value: bigint, opts: {
        queryId: number,
        jettonAmount: bigint,
        toAddress: Address,
        forwardTonAmount: bigint,
        forwardPayload: Cell  
    }) {
        await provider.internal(via, {
            value: value + opts.forwardTonAmount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                    .storeUint(0x0f8a7ea5, 32)
                    .storeUint(opts.queryId, 64)
                    .storeCoins(opts.jettonAmount)
                    .storeAddress(opts.toAddress)
                    .storeAddress(via.address)
                    .storeBit(0)
                    .storeCoins(opts.forwardTonAmount)
                    .storeBit(1)
                    .storeRef(opts.forwardPayload)
                .endCell()

        })
    }

    async getJettonWalletData(provider: ContractProvider) {
        let { stack } = await provider.get('get_wallet_data', [])
        
        return {
            balance: stack.readBigNumber(),
            owner: stack.readAddress(),
            master: stack.readAddress(),
            walletCode: stack.readCell()
        }
    }
}
