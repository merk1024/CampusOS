const reportToWebhook = async (payload) => {
  const webhookUrl = String(process.env.MONITORING_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    return false;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error('Monitoring webhook error:', error);
    return false;
  }
};

const captureMonitoringEvent = async ({
  level = 'error',
  source = 'backend',
  message,
  requestId = null,
  details = null
}) => {
  if (!message) {
    return false;
  }

  return reportToWebhook({
    app: 'CampusOS',
    level,
    source,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    details
  });
};

module.exports = {
  captureMonitoringEvent
};
