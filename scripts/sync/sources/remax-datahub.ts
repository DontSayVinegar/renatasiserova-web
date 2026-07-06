/**
 * STUB — RE/MAX Europe DataHub API adapter.
 *
 * When RE/MAX ČR grants API access (OAuth2 credentials + Renata's
 * agentUniqueId), implement ListingSource here and switch the source
 * in ../index.ts from createScrapeSource() to createDataHubSource().
 *
 * Docs: https://apidocs.datahub.remax.eu/
 * The rest of the pipeline (normalize → translate → images → merge → write)
 * is source-agnostic and stays untouched.
 */
import type { ListingSource } from './types';

export function createDataHubSource(): ListingSource {
  throw new Error(
    'DataHub adapter not implemented yet — waiting for API credentials from RE/MAX ČR HQ.',
  );
}
