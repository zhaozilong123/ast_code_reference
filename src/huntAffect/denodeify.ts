/**
 * @internal
 * @param func
 */
export default function denodeify<Response>(func: Function) {
  return (...args: any[]) =>
    new Promise<Response>((resolve, reject) => {
      func(...args, (err: Error, res: Response) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      });
    });
}
