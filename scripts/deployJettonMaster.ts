import { toNano } from '@ton/core';
import { JettonMaster } from '../wrappers/JettonMaster';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const jettonMaster = provider.open(JettonMaster.createFromConfig({}, await compile('JettonMaster')));

    await jettonMaster.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(jettonMaster.address);

    // run methods on `jettonMaster`
}
