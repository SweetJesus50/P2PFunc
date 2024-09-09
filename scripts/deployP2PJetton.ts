import { toNano } from '@ton/core';
import { P2PJetton } from '../wrappers/P2PJettonSingle';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const p2PJetton = provider.open(P2PJetton.createFromConfig({}, await compile('P2PJetton')));

    await p2PJetton.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(p2PJetton.address);

    // run methods on `p2PJetton`
}
