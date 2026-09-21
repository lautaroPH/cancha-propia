-- Identity verification needs both the ID document and a selfie holding it
-- (plan §4: "National ID number + selfie-with-ID at application time") —
-- previously only id_document existed, collapsing two distinct pieces of
-- evidence into one.
alter type evidence_kind add value 'selfie_with_id';
