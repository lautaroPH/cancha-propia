-- Lets an admin pause a live/grace campaign without closing it outright —
-- closed is terminal (self-serve, athlete-initiated), paused is an admin
-- hold that can be lifted back to active.
alter type campaign_status add value 'paused';
