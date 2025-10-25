import { service } from '@ember/service';

/**
 * Decorates a route such that it refreshes the route when the path clears.
 *
 * @param {string} cachePath The path as seen by mu-cache.
 */
export default function(cachePath) {
  return function(klass) {
    return class extends klass {
      @service pushUpdates;
      @service router;

      refresh = () => this.router.refresh();

      activate() {
        super.activate(...arguments);
        this.pushUpdates.monitorCache({
          path: cachePath,
          callback: this.refresh,
          initial: false
        });
      }

      deactivate() {
        super.activate(...arguments);
        this.pushUpdates.unMonitorCache({
          path: cachePath,
          callback: this.refresh,
        });
      }
    }
  }
}
