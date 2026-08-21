import { publicConfig } from "./runtime-config";
import { type Fixture } from "./upcoming-fixtures";

export type VideoStatus = "LIVE" | "BUFFERING" | "DELAYED" | "OFFLINE" | "UNCONFIGURED" | "DISABLED";

export type LiveVideoSource = {
  provider_id: string;
  provider_name: string;
  fixture_id: string;
  video_provider_fixture_id?: string;
  video_url?: string;
  embed_url?: string;
  deep_link?: string;
  external_url?: string;
  status: VideoStatus;
  updated_at?: string;
  notice: string;
};

export interface LiveVideoProvider {
  providerId: string;
  providerName: string;
  sourceForFixture(fixture: Fixture): LiveVideoSource;
}

function configuredUrl(template: string, fixtureId: string) {
  return template ? template.replaceAll("{fixture_id}", encodeURIComponent(fixtureId)) : undefined;
}

export class SportzfyVideoProvider implements LiveVideoProvider {
  providerId = "sportzfy";
  providerName = "Sportzfy";

  sourceForFixture(fixture: Fixture): LiveVideoSource {
    const fixtureId = fixture.identity.arawee_fixture_id;
    const embedUrl = configuredUrl(publicConfig.sportzfy.embedUrl, fixture.identity.video_provider_fixture_id || fixtureId);
    if (!publicConfig.sportzfy.enabled) {
      return { provider_id: this.providerId, provider_name: this.providerName, fixture_id: fixtureId, status: "DISABLED", notice: "Sportzfy integration is disabled in this public build." };
    }
    if (embedUrl) {
      return {
        provider_id: this.providerId,
        provider_name: this.providerName,
        fixture_id: fixtureId,
        video_provider_fixture_id: fixture.identity.video_provider_fixture_id,
        embed_url: embedUrl,
        deep_link: publicConfig.sportzfy.deepLink || undefined,
        external_url: publicConfig.sportzfy.downloadUrl,
        status: "LIVE",
        notice: "Configured provider embed. Its availability and rights are determined by the provider.",
      };
    }
    return {
      provider_id: this.providerId,
      provider_name: this.providerName,
      fixture_id: fixtureId,
      video_provider_fixture_id: fixture.identity.video_provider_fixture_id,
      deep_link: publicConfig.sportzfy.deepLink || undefined,
      external_url: publicConfig.sportzfy.downloadUrl,
      status: "UNCONFIGURED",
      notice: "No compatible in-app Sportzfy video or embed source is configured for this fixture.",
    };
  }
}

const sportzfyProvider = new SportzfyVideoProvider();

export function videoSourceForFixture(fixture: Fixture) {
  return sportzfyProvider.sourceForFixture(fixture);
}
