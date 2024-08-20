import { toNano } from '@ton/core';
import { P2p } from '../wrappers/P2p';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const p2p = provider.open(P2p.createFromConfig({}, await compile('P2p')));

    await p2p.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(p2p.address);

    // run methods on `p2p`
}
