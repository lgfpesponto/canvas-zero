import { ProxyProvider } from './proxyProvider';

let instance: ProxyProvider | null = null;
export function getFiscalProvider(): ProxyProvider {
  if (!instance) instance = new ProxyProvider();
  return instance;
}
