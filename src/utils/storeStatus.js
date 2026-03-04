/**
 * Store status for web checkout (parity with mobile storeStatus).
 * @param {Object} storeProfile - store/profile from Firestore
 * @param {Function} t - i18n t(key)
 * @param {'delivery'|'pickup'} orderType
 * @returns {{ status: 'open'|'closed'|'closing_soon', message: string, nextTime?: string }}
 */
export function getStoreStatus(storeProfile, t, orderType = 'pickup') {
    if (!storeProfile) {
        return { status: 'closed', message: t('web.closed') };
    }
    if (storeProfile.isManualClosed) {
        return { status: 'closed', message: t('web.closed') };
    }
    if (orderType === 'delivery' && storeProfile.isDeliveryManualClosed) {
        return { status: 'closed', message: t('web.closed') };
    }

    let workingHoursWeekly = storeProfile.workingHoursWeekly;
    if (orderType === 'pickup' && storeProfile.pickupHours) {
        workingHoursWeekly = storeProfile.pickupHours;
    } else if (orderType === 'delivery' && storeProfile.deliveryHours) {
        workingHoursWeekly = storeProfile.deliveryHours;
    }

    if (!workingHoursWeekly) {
        return { status: 'closed', message: t('web.closed') };
    }

    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const hours = workingHoursWeekly[currentDay];

    if (!hours || hours.closed) {
        return { status: 'closed', message: t('web.closed') };
    }

    const [openH, openM] = hours.open.split(':').map(Number);
    const [closeH, closeM] = hours.close.split(':').map(Number);

    const openTime = new Date(now);
    openTime.setHours(openH, openM, 0, 0);

    let closeTime = new Date(now);
    closeTime.setHours(closeH, closeM, 0, 0);

    if (closeTime <= openTime) {
        closeTime.setDate(closeTime.getDate() + 1);
    }

    const nowTime = now.getTime();
    const isOpen = nowTime >= openTime.getTime() && nowTime < closeTime.getTime();

    if (isOpen) {
        const diffMs = closeTime.getTime() - nowTime;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins <= 60) {
            const mins = Math.min(Math.max(0, diffMins), 60);
            const displayTime = mins > 0 ? `${mins} ${t('web.m')}` : t('web.closingNow');
            return {
                status: 'closing_soon',
                message: `${t('web.closingSoon')} (${displayTime})`,
                nextTime: hours.close
            };
        }
        return {
            status: 'open',
            message: `${t('web.openUntil')} ${formatTo24Hour(hours.close)}`,
            nextTime: hours.close
        };
    }

    return { status: 'closed', message: t('web.closed') };
}

/** Format time as 24h HH:mm for admin and app display. */
export function formatTo24Hour(timeStr) {
    if (!timeStr) return '';
    const [hStr, mStr = '00'] = timeStr.split(':');
    const h = Math.max(0, Math.min(23, parseInt(hStr || '0', 10)));
    const m = Math.max(0, Math.min(59, parseInt(mStr || '0', 10)));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** @deprecated Use formatTo24Hour. Kept for compatibility; now returns 24h format. */
export function formatTo12Hour(timeStr) {
    return formatTo24Hour(timeStr);
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function formatWorkingHoursForDisplay(workingHoursWeekly, t) {
    if (!workingHoursWeekly || Object.keys(workingHoursWeekly).length === 0) {
        return '—';
    }
    return DAY_KEYS
        .map(day => {
            const s = workingHoursWeekly[day];
            const dayLabel = t(`store.days.${day}`);
            if (!s || s.closed) return `${dayLabel}: ${t('web.closed')}`;
            return `${dayLabel}: ${formatTo24Hour(s.open)} - ${formatTo24Hour(s.close)}`;
        })
        .join('\n');
}

/**
 * Returns an array of { dayLabel, hoursText } for rendering each day as a row.
 */
export function getWorkingHoursRows(workingHoursWeekly, t) {
    if (!workingHoursWeekly || Object.keys(workingHoursWeekly).length === 0) {
        return [];
    }
    return DAY_KEYS.map(day => {
        const s = workingHoursWeekly[day];
        const dayLabel = t(`store.days.${day}`);
        const hoursText = !s || s.closed ? t('web.closed') : `${formatTo12Hour(s.open, t)} - ${formatTo12Hour(s.close, t)}`;
        return { dayLabel, hoursText };
    });
}

/**
 * Generate time slots (every 30 min) for a day from working hours.
 * @param {Object} schedule - { open, close, closed }
 * @returns {{ time: string, offsetMins: number }[]}
 */
export function generateSlotsForDay(schedule) {
    if (!schedule || schedule.closed || !schedule.open || !schedule.close) return [];
    const slots = [];
    const [openH, openM] = schedule.open.split(':').map(Number);
    const [closeH, closeM] = schedule.close.split(':').map(Number);
    let startTotalMins = openH * 60 + openM;
    let endTotalMins = closeH * 60 + closeM;
    if (endTotalMins <= startTotalMins) endTotalMins += 24 * 60;
    let current = startTotalMins;
    while (current < endTotalMins) {
        const h = Math.floor(current / 60) % 24;
        const m = current % 60;
        slots.push({
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            offsetMins: current
        });
        current += 30;
    }
    return slots;
}
