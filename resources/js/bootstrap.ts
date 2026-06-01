import axios from 'axios';

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/**
 * When the backend rejects a request with a typed billing payload
 * (out_of_credits / feature_limit / expired_plan) it returns HTTP 402
 * with a JSON envelope. Surface it as a window event so the global
 * LimitReachedModal can react regardless of which create flow fired it.
 */
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const data = error?.response?.data;
        if (
            error?.response?.status === 402 &&
            data &&
            typeof data === 'object' &&
            'reason' in data
        ) {
            window.dispatchEvent(
                new CustomEvent('billing:limit-reached', { detail: data }),
            );
        }
        return Promise.reject(error);
    },
);
