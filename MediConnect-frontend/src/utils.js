export const money = (value) => {
  const amount = Number(value ?? 0);

  return `₹${Number.isFinite(amount)
    ? amount.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
      })
    : '0'}`;
};

export const dateTime = (value) => {
  if (!value) return 'Not scheduled';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }

  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const initials = (name) => {
  const value = String(name || 'U').trim();

  if (!value) return 'U';

  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export const toast = (message, type = 'success') => {
  window.dispatchEvent(
    new CustomEvent('mc-toast', {
      detail: {
        message: String(message || ''),
        type,
      },
    })
  );
};

export const shareLink = async (url, title = 'MediConnect') => {
  if (!url) {
    toast('No link available to share', 'error');
    return false;
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title,
        url,
      });

      return true;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast('Link copied to clipboard');
      return true;
    }

    toast('Sharing is not supported on this browser', 'error');
    return false;
  } catch (error) {
    // Closing the native share dialog is not an actual error.
    if (error?.name === 'AbortError') {
      return false;
    }

    toast('Could not share link', 'error');
    return false;
  }
};