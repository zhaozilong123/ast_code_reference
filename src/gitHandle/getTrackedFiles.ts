import exec from './exec';
import gitRoot from './gitRoot';

const root = gitRoot();

/** @internal */
export default function getTrackedFiles(revision: string, paths?: string[]) {
  const pathsInCmd = paths && paths.length ? paths.join(' ') : root;
  // zy-feat
  const _revision = revision?.trim() === '' ? 'HEAD' : revision;
  const raw = exec(
    `git ls-tree -r ${_revision} --name-only --full-name ${pathsInCmd}`
  );
  return raw.split('\n');
}
