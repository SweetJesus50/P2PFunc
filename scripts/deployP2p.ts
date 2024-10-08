import { Address, toNano } from '@ton/core';
import { P2p } from '../wrappers/P2pSingle';
import { compile, NetworkProvider } from '@ton/blueprint';
import { buildOnchainMetadata } from '../wrappers/onChain';

export async function run(provider: NetworkProvider) {
    const p2p = provider.open(P2p.createFromConfig({
        arbitratorAddress: provider.sender().address as Address,
        lessorAddress: Address.parse(""),
        renterAddress: Address.parse(""),
        content: buildOnchainMetadata({item_name: "Snowboard", image: "image_link"}),
        cost: toNano(1),
        arbitratorFeePercent: toNano("0.03"),
        rentTime: Math.floor(Date.now() / 1000) + 300

    }, await compile('P2p')));

    await p2p.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(p2p.address);

    // run methods on `p2p`
}
