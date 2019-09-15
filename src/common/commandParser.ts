#!/usr/bin/env node
import flexi, { until } from "flexi-path";
import {
  FlexiPath,
  WalkedPath,
  Path,
  PathType
} from "flexi-path/dist/src/types";
import extensionless from "extensionless";

import { Command, CommandParser } from "../types";
import moduleLogger from "./logger";

const rootCommandPath = flexi
  .path(__dirname)
  .parent(x => x.name === "src")
  .append("commands/");

const logger = moduleLogger.createLogger(module);

const isHelp = (...args: string[]): boolean => {
  return (args.length > 0 && args[0] === "-h") || false;
};

const isDebug = (...args: string[]): boolean =>
  args.filter(x => x === "--debug").length > 0;

const mostSpecificCommand = (args: Path): WalkedPath<FlexiPath> => {
  return flexi.walk.back(args, {
    until: until.exists({ ignoreFileExtensions: true })
  });
};

const commandName = (args: Path): string => {
  const { result } = mostSpecificCommand(args);

  let { name } = result;

  if (result.type() === PathType.File && result.name === "index") {
    name = result.parent().name;
  }

  return extensionless(name);
};

const commandFullName = (args: Path): string => {
  const { result } = mostSpecificCommand(args);

  return result
    .except(rootCommandPath)
    .flatten()
    .map(x => x.name)
    .join(" ");
};

const requireContent = (path: FlexiPath): any | undefined => {
  let modulePath: FlexiPath | undefined = path;
  if (path.type() === PathType.Directory) {
    modulePath = path.files().find(x => x.name === "index");
  }

  if (modulePath !== undefined) {
    // eslint-disable-next-line import/no-dynamic-require,global-require,@typescript-eslint/no-var-requires
    return require(modulePath.path).default;
  }

  return undefined;
};

const isCommand = (path: FlexiPath) => {
  const { result } = mostSpecificCommand(path);

  return (
    result.type() === PathType.File ||
    result.files().find(x => x.name === "index") !== undefined
  );
};

const createCommand = (path: FlexiPath): Command => {
  const { result, diff } = mostSpecificCommand(path);

  const content = requireContent(result);
  return {
    name: commandName(result),
    fullname: commandFullName(result),
    run: content.run,
    helpname: content.helpname,
    description: content.description,
    args: diff.path.split(" "),
    subCommands: result
      .children()
      .filter(x => isCommand(x))
      .map(x => createCommand(x))
  };
};

const allCommands = (): Command[] => {
  return rootCommandPath
    .children()
    .filter(x => isCommand(x))
    .map(x => createCommand(x));
};

const withoutOptions = (...args: string[]): string[] =>
  args.filter(x => !x.startsWith("-"));

const parse = (...args: string[]): Command | null => {
  const path = rootCommandPath.append(args);

  return isCommand(path) ? createCommand(path) : null;
};

const commandParser = (...args: string[]): CommandParser => {
  const commandArgs = [...(args || [])];
  const cleanArgs = withoutOptions(...args);

  return {
    all: () => allCommands(),
    find: () => parse(...cleanArgs),
    isHelp: isHelp(...commandArgs),
    isDebug: isDebug(...commandArgs)
  };
};

export default commandParser;
