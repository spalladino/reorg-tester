# reorg-tester

Sample code for triggering reorganizations in a private geth network. This is very much a work in progress.

## How it works

Runs two geth nodes with autodiscovery disabled, and abuses calls to the admin interface to add and remove them as peers, thus triggering chain splits. Nodes run using a very low difficulty proof-of-work.

Most of the magic happens in the `joinChains(winner, loser)` function, wich receives the connections to the winner and loser nodes, mines blocks in the winner chain as necessary to ensure the total difficulty is greater than the loser, and then adds both nodes as peers.

See `index.spec.ts` for sample usage.

## Usage

Pending setting this up as an actual package to be usable!

## How to run this repo on your machine

- Clone the repo and `npm install`
- Start both geth nodes with `npm start`
- Run the tests with `npm test` which will trigger a reorg in node-2!

```bash
# Sample run
[node-2] INFO [05-25|22:29:08.511] Chain reorg detected number=10 hash="3bd073...42bb21" drop=1 dropfrom="dc55a4...3e0e28" add=2 addfrom="446648...a1cb1f"
```