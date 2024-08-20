import { toNano } from '@ton/core';
import { Arbitrator } from '../wrappers/Arbitrator';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const arbitrator = provider.open(Arbitrator.createFromConfig({}, await compile('Arbitrator')));

    await arbitrator.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(arbitrator.address);

    // run methods on `arbitrator`
}
