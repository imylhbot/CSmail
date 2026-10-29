/** Per-recipient-domain push routing. Rules are stored alongside PUSH_CONFIG_V1. */
export const normalizeDomain = value => String(value || '').trim().toLowerCase().replace(/^@/, '').replace(/\.$/, '');
export function recipientDomain(email) {
  const address = String(email?.toEmail || email?.to || '').trim().toLowerCase();
  const at = address.lastIndexOf('@');
  return at > 0 ? normalizeDomain(address.slice(at + 1)) : '';
}
export function matchingTargets(config, email) {
  const domain = recipientDomain(email);
  const rules = Array.isArray(config.domainRules) ? config.domainRules : [];
  const matched = [];
  for (const rule of rules) {
    if (!rule || rule.enabled === false) continue;
    const domains = Array.isArray(rule.domains) ? rule.domains : String(rule.domains || '').split(/[,;\s]+/);
    if (!domains.some(d => normalizeDomain(d) === domain || String(d).trim() === '*')) continue;
    for (const item of Array.isArray(rule.targets) ? rule.targets : []) {
      if (!item || item.enabled === false || !item.id || !item.provider) continue;
      matched.push({ ruleId: rule.id, targetId: item.id, provider: item.provider, settings: item.settings || {} });
    }
  }
  // If no rules have been configured, keep existing global settings behavior.
  return { domain, targets: matched, useGlobal: rules.length === 0 || config.alsoSendGlobal === true };
}
