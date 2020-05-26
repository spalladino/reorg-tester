import { connectNodes, disconnectNodes, getWallets, mineBlock, joinChains, setVerbose, waitForSync } from '.';
import { JsonRpcProvider } from 'ethers/providers';
import { readFileSync } from 'fs';
import { ContractFactory, Contract, Wallet } from 'ethers';

setVerbose();

async function deploySampleContract(wallet: Wallet) : Promise<Contract> {
  const abi = readFileSync('contracts/Sample.abi').toString();
  const bin = readFileSync('contracts/Sample.bin').toString();
  
  const factory = new ContractFactory(abi, bin, wallet);
  const contract = await factory.deploy();
  
  await mineBlock(wallet.provider as JsonRpcProvider);
  return contract;
}

function attachSampleContract(wallet: Wallet, address: string) : Contract {
  const abi = readFileSync('contracts/Sample.abi').toString();
  return new Contract(address, abi, wallet);
}

describe('reorg', () => {
  it('works', async () => {
    const [p1, p2] = await connectNodes();
    const [w1, w2] = getWallets();

    const contract1 = await deploySampleContract(w1);
    await waitForSync([p1, p2]);
    const contract2 = attachSampleContract(w2, contract1.address);
    
    await disconnectNodes();
    
    await Promise.all([contract1, contract2].map(async (c, i) => {
      await c.setValue(`node-${i+1}`);
      await mineBlock(c.provider as JsonRpcProvider);
    }));
    
    expect(await contract1.value()).toBe('node-1');
    expect(await contract2.value()).toBe('node-2');
    
    await joinChains(p1, p2);

    expect(await contract1.value()).toBe('node-1');
    expect(await contract2.value()).toBe('node-1');
  });
});