import { Command } from '@oclif/command';
import { LCDClient } from '@terra-money/feather.js';
import { loadConfig, loadConnections, CONFIG_FILE_NAME as execPath } from '../../config';
import { migrate, storeCode } from '../../lib/deployment';
import { getSigner } from '../../lib/signer';
import * as flag from '../../lib/flag';
import runCommand from '../../lib/runCommand';
import defaultErrorCheck from '../../lib/defaultErrorCheck';

export default class ContractMigrate extends Command {
  static description = 'Migrate the contract.';

  static flags = {
    'no-rebuild': flag.noRebuild,
    'instance-id': flag.instanceId,
    'code-id': flag.codeId,
    ...flag.tx,
    ...flag.terrainPaths,
  };

  static args = [{ name: 'contract', required: true }];

  async run() {
    const { args, flags } = this.parse(ContractMigrate);

    // Command to be performed.
    const command = async () => {
      const connections = loadConnections(flags.prefix);
      const config = loadConfig();
      const conf = config(flags.network, args.contract);
      const connection = connections(flags.network);

      const lcd = new LCDClient({ [connection.chainID]: connection });
      const signer = await getSigner({
        network: flags.network,
        signerId: flags.signer,
        keysPath: flags['keys-path'],
        lcd,
        prefix: flags.prefix,
      });

      const codeId = await storeCode({
        conf,
        noRebuild: flags['no-rebuild'],
        contract: args.contract,
        signer,
        network: flags.network,
        refsPath: flags['refs-path'],
        lcd,
        prefix: flags.prefix,
      });

      migrate({
        conf,
        signer,
        contract: args.contract,
        codeId,
        network: flags.network,
        instanceId: flags['instance-id'],
        refsPath: flags['refs-path'],
        lcd,
        prefix: flags.prefix,
      });
    };

    // Attempt to execute command while backtracking through file tree.
    await runCommand(
      execPath,
      command,
      defaultErrorCheck(args.contract),
    );
  }
}
