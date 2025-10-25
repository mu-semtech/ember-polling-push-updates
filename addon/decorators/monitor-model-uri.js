import { service } from '@ember/service';

/**
 * Decorates a route such that it refreshes the route when the uri of the model clears.
 */
export default function(klass) {
  return class extends klass {
    @service pushUpdates;

    lastModel = null;

    async setupController(_controller, model) {
      super.setupController(...arguments);
      this.lastModel && await this.pushUpdates.unMonitorModel(this.lastModel);
      this.lastModel = model;
      await this.pushUpdates.monitorModel( model );
    }

    async deactivate() {
      super.deactivate(...arguments);
      await this.pushUpdates.unMonitorModel( this.lastModel );
    }
  }
}
