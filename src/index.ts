import { JsonRpcProvider, Provider } from 'ethers/providers';
import { Wallet } from 'ethers';

export interface NodeSettings {
  rpcPort: number,
  netPort: number
}

export type NodesSettings = [NodeSettings, NodeSettings];

export const DefaultNodesSettings : NodesSettings = [
  { rpcPort: 12001, netPort: 30201 },
  { rpcPort: 12002, netPort: 30202 },
]

export type Providers = [JsonRpcProvider, JsonRpcProvider]

interface NodeInfo {
  id: string,
  name: string,
  enode: string,
  ip: string,
  ports: { discovery: number, listener: number },
  protocols: {
    eth: {
      network: number,
      difficulty: number,
      genesis: string,
    }
  }
}

const sleep = (timeout: number) => new Promise(resolve => { window.setTimeout(() => resolve(), timeout) });
const poll = async (condition: () => Promise<boolean>, interval: number) => { while (!await condition()) sleep(interval); }
const log = (...stuff: any[]) => (verbose && console.log(...stuff));

let verbose = false;
export function setVerbose(value = true) {
  verbose = value;
}

export function getProviders(nodeSettings = DefaultNodesSettings) : Providers {
  return nodeSettings.map(({rpcPort}) => new JsonRpcProvider(`http://127.0.0.1:${rpcPort}`, 4242)) as Providers;
}

export async function getNodeInfo(provider: JsonRpcProvider) : Promise<NodeInfo> {
  return (await provider.send('admin_nodeInfo', [])) as NodeInfo;
}

export async function waitForSync(providers: Providers) {
  const headsMatch = async () => {
    const [head1, head2] = await Promise.all(providers.map(p => p.getBlock('latest')));
    return head1.hash === head2.hash;
  }
  log(`Awaiting for chains to sync`);
  await poll(headsMatch, 500);
  log(`Chains synced`);
}

export async function connectNodes(nodeSettings = DefaultNodesSettings) : Promise<Providers> {
  log(`Connecting nodes`);
  const providers = await setNodesConnection(true, nodeSettings);
  const headsMatch = async () => {
    const [head1, head2] = await Promise.all(providers.map(p => p.getBlock('latest')));
    return head1.hash === head2.hash;
  }

  await waitForSync(providers);  
  return providers;
}

export async function disconnectNodes(nodeSettings = DefaultNodesSettings) : Promise<Providers> {
  log(`Disconnecting nodes`);
  const providers = await setNodesConnection(false, nodeSettings);
  log(`Disconnected`);
  return providers;
}

async function setNodesConnection(connected: boolean, nodeSettings = DefaultNodesSettings) : Promise<Providers> {
  const getEnode = async (p: JsonRpcProvider) => (await getNodeInfo(p)).enode;

  const providers = getProviders(nodeSettings);
  const [p1, p2] = providers;
  const [e1, e2] = await Promise.all(providers.map(getEnode));
  const method = connected ? 'admin_addPeer' : 'admin_removePeer';
  await Promise.all([
    p1.send(method, [e2]),
    p2.send(method, [e1]),
  ]);

  return providers;
}

export async function mineUntil(provider: JsonRpcProvider, when: (blockNumber: number) => Promise<boolean>) {
  const currentBlock = await provider.getBlockNumber();
  let resolved = false;
  
  log(`Starting mining from block ${currentBlock}`);
  return new Promise((resolve, reject) => {
    provider.on('block', async (blockNumber) => {
      if (blockNumber > currentBlock && (await when(blockNumber))) {
        if (!resolved) {
          resolved = true;
          log(`Stopping mining at block ${blockNumber}`);
          provider.send('miner_stop', []);
          resolve();
        }
      }
    });
    provider.send('miner_start', [1]);
  });
}

export async function mineBlock(provider: JsonRpcProvider) {
  await mineUntil(provider, () => Promise.resolve(true));
}

export async function joinChains(winner: JsonRpcProvider, loser: JsonRpcProvider) {
  const getDifficulty = async (p: JsonRpcProvider) => (await getNodeInfo(p)).protocols.eth.difficulty;
  const winnerWon = async () => {
    const [winnerDifficulty, loserDifficulty] = await Promise.all([winner, loser].map(getDifficulty));
    return winnerDifficulty > loserDifficulty;
  }

  if (!(await winnerWon())) {
    log(`Mining blocks until wins in difficulty`);
    await mineUntil(winner, winnerWon);
  }
  
  await connectNodes();
}

export function getWallet(provider: Provider, privateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d') : Wallet {
  return new Wallet(privateKey, provider);
}

export function getWallets(nodeSettings = DefaultNodesSettings, privateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d') : [Wallet, Wallet] {
  const providers = getProviders(nodeSettings);
  return providers.map(p => new Wallet(privateKey, p)) as [Wallet, Wallet];
}