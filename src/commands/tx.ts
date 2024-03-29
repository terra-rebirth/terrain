import { Command } from '@oclif/command';
import { LCDClient, AccAddress, MsgExecuteContract } from '@terra-money/feather.js';
import { loadConnections } from '../config';
import * as flag from '../lib/flag';
import TerrainCLI from '../TerrainCLI';
import { getSigner } from '../lib/signer';

export default class Tx extends Command {
  static description = 'Execute tx on the interchain';

  static examples = [
    '$ terrain tx terra1..fx9fs \'{"increment": {}}\'',
    '$ terrain tx juno1..af00x \'{"reset": {"count": 0}}\' --network testnet',
  ];

  static flags = {
    ...flag.tx,
    ...flag.terrainPaths,
  };

  static args = [{
    name: 'contract', required: true, description: 'Contract address', type: 'string',
  },
  {
    name: 'msg', required: true, description: 'Tx msg to be executed in JSON format', type: 'string',
  }];

  async run() {
    const { args, flags } = this.parse(Tx);
    const prefix = AccAddress.getPrefix(args.contract);

    const connections = loadConnections(prefix);
    const connection = connections(flags.network);
    const { chainID } = connection;
    const lcd = new LCDClient({ [chainID]: connection });

    const signer = await getSigner({
      network: flags.network,
      signerId: flags.signer,
      keysPath: flags['keys-path'],
      lcd,
      prefix: flags.prefix,
    });

    try {
      const accAddress = signer.key.accAddress(prefix);
      const msg = new MsgExecuteContract(accAddress, args.contract, JSON.parse(args.msg));

      const execMsg = await signer.createAndSignTx({ chainID, msgs: [msg] });
      const res = await lcd.tx.broadcast(execMsg, chainID);

      TerrainCLI.success(`Tx hash:\n\n ${res.txhash}`);
    } catch (err: any) {
      let errMsg = 'There was an error with your query. \n\n';
      if (err instanceof SyntaxError) {
        errMsg += ('Make sure you have single quotes around your query and double quotes around query keys.');
      } else {
        errMsg += (JSON.stringify(err.response?.data?.message || err.message || err, null, 2));
      }
      TerrainCLI.error(errMsg);
    }
  }
}
