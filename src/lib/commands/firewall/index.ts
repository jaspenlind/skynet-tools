#!/usr/bin/env node
import { CommandDeclaration } from "../../../types";
import ssh from "../../ssh";

const firewall = (args: string[]): void => {
  const firewallArgs = (args || []).join(" ");
  const interactive = firewallArgs === "";

  const command = "sh /jffs/scripts/firewall";

  if (interactive) {
    ssh.executeInTerminal(command);
  } else {
    ssh.execute(`${command} ${firewallArgs}`);
  }
};

const declaration: CommandDeclaration = {
  run: firewall,
  helpName: "firewall [args]",
  description: "Opens the Skynet firewall with (optional) arguments"
};

export default declaration;
