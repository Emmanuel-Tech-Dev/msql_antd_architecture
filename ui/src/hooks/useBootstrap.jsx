const useBootstrap = () => {

    console.warn('[useBootstrap] Deprecated. Bootstrap is handled by FrameworkProvider.');
    return { loading: false, refetch: () => { } };
};

export default useBootstrap;