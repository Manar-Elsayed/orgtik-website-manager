function isServiceCatalogId(S, id) {
  const offer = S.db.websiteOffers?.find(row => (row.planId || row.serviceId) === id);
  if (offer) return offer.kind === 'service';
  return S.db.plans.some(row => row.id === id && row.service) || S.db.services.some(row => row.id === id);
}
module.exports = { isServiceCatalogId };
