import { service } from '@ember/service';
import Route from '@ember/routing/route';

export default class ResourceUriMonitoring extends Route {
  @service pushUpdates;

  // Model for deregistering monitoring on unload
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
