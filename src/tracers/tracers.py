import marimo

__generated_with = "0.13.6"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# Trace Estimation""")
    return


@app.cell
def _(mo):
    mo.md(
        r"""
    ## Shared Functions

    """
    )
    return


@app.cell
def _():
    import mlx.core as mx
    from pydantic import PositiveInt, validate_call, NonNegativeInt

    @validate_call
    def generate_rademacher_vectors(n_rows: PositiveInt, k: NonNegativeInt) -> mx.array:
        """Generates k Rademacher random vectors of dimension n_rows."""
        # Ensure k is at least 0, if k=0, shape will be (n_rows, 0) which is fine.
        if k == 0:
            return mx.zeros((n_rows, 0), dtype=mx.float32)
        # Ensure bernoulli output is float32 before arithmetic
        return 2 * mx.random.bernoulli(p=mx.array(0.5), shape=(n_rows, k)).astype(mx.float32) - 1.0
    return PositiveInt, generate_rademacher_vectors, mx, validate_call


@app.cell
def _(mo):
    mo.md(r"""## The Hutchison Trace Estimator""")
    return


@app.cell
def _(PositiveInt, generate_rademacher_vectors, mx):
    def hutch(m: mx.array, k: PositiveInt) -> mx.float32: # Changed return type to mx.float32
        """
        Estimates the trace of a square matrix m using Hutchinson's method
        with k Rademacher random vectors.

        Args:
            m: The input square matrix. Must be of a type compatible with mx.float32 operations.
            k: The number of Rademacher random vectors to use for the estimation.

        Returns:
            An estimate of the trace of m as a mx.float32.
        """
        n_rows, n_cols = m.shape
        assert n_rows == n_cols, "Input matrix must be square."
        assert k > 0, "Number of random vectors k must be positive."

        # Ensure the input matrix is float32 for consistency,
        # or that operations will correctly promote/handle types.
        # Forcing m to float32 if it isn't already.
        if m.dtype != mx.float32:
            m = m.astype(mx.float32)

        # Generate k Rademacher random vectors (already float32 from the helper)
        rademacher_vectors: mx.array = generate_rademacher_vectors(n_rows, k)
        print(rademacher_vectors)

        # Compute v_i^T @ m @ v_i for each vector v_i
        m_dot_v: mx.array = m @ rademacher_vectors # Result will be float32 if m and rademacher_vectors are
        v_t_m_v: mx.array = mx.sum(rademacher_vectors * m_dot_v, axis=0) # Result will be float32

        # The Hutchinson estimator is the average of these values
        trace_estimate: mx.array = mx.mean(v_t_m_v) # mx.mean will preserve float32

        return trace_estimate.astype(mx.float32) # Ensure final return is explicitly float32


    # Example Usage
    # Create a sample square matrix
    matrix_size: PositiveInt = 100
    # Ensure A is created as float32 from the start
    A: mx.array = mx.random.normal(shape=(matrix_size, matrix_size)).astype(mx.float32)

    # Calculate the true trace
    true_trace: mx.array = mx.trace(A).astype(mx.float32) # Ensure true trace is also float32 for comparison
    print(f"True Trace: {true_trace.item():.4f}") # .item() will extract the Python float

    # Estimate the trace using Hutchinson's method
    num_vectors_k: PositiveInt = 50
    estimated_trace: mx.array = hutch(A, num_vectors_k)
    print(f"Estimated Trace with k={num_vectors_k}: {estimated_trace.item():.4f}")

    num_vectors_k_large: PositiveInt = 500
    estimated_trace_large_k: mx.array = hutch(A, num_vectors_k_large)
    print(f"Estimated Trace with k={num_vectors_k_large}: {estimated_trace_large_k.item():.4f}")

    # Test with a smaller matrix
    B_size: PositiveInt = 3
    B: mx.array = mx.array([[1, 2, 3], [4, 5, 6], [7, 8, 9]], dtype=mx.float32) # Explicitly float32
    true_trace_B: mx.array = mx.trace(B).astype(mx.float32)
    print(f"\nMatrix B:\n{B}")
    print(f"True Trace of B: {true_trace_B.item():.4f}")

    k_B: PositiveInt = 100
    estimated_trace_B: mx.array = hutch(B, k_B)
    print(f"Estimated Trace of B with k={k_B}: {estimated_trace_B.item():.4f}")

    k_B_large: PositiveInt = 1000
    estimated_trace_B_large: mx.array = hutch(B, k_B_large)
    print(f"Estimated Trace of B with k={k_B_large}: {estimated_trace_B_large.item():.4f}")
    return (hutch,)


@app.cell
def _(mo):
    mo.md(r"""## A Variance Reduced Trace Estimator""")
    return


@app.cell
def _(PositiveInt, generate_rademacher_vectors, hutch, mx, validate_call):
    @validate_call(config={'arbitrary_types_allowed' : True})
    def hutch_variance_reduced(m: mx.array, k: PositiveInt) -> mx.float32:
        """
        Estimates the trace of a square matrix m using a variance-reduced
        Hutchinson's method (related to Hutch++). It uses two-thirds of the
        test vectors for sketching and the rest for computing the trace of the residual.

        Args:
            m: The input square matrix. Must be compatible with mx.float32 operations.
            k: The total number of Rademacher random vectors to use. Must be a positive integer.
               The function behaves correctly for k=1 and k=2, though the benefits
               of variance reduction are more pronounced with larger k.

        Returns:
            An estimate of the trace of m as a mx.float32.
        """
        n_rows, n_cols = m.shape
        assert n_rows == n_cols, "Input matrix must be square."
        # k is PositiveInt, so k >= 1.

        if m.dtype != mx.float32:
            m = m.astype(mx.float32)

        # 1. Split k into k_sketch and k_residual
        # Ensure k_sketch and k_residual are non-negative.
        # If k=1, k_sketch = 0, k_residual = 1.
        # If k=2, k_sketch = 1, k_residual = 1.
        # If k=3, k_sketch = 2, k_residual = 1.
        k_sketch = (2 * k) // 3
        k_residual = k - k_sketch

        # 2. Generate Rademacher Vectors
        # S for sketching, T for residual trace estimation
        S_vectors = generate_rademacher_vectors(n_rows, k_sketch)  # (n_rows, k_sketch), float32
    
        # Initialize trace_sketched and Q. Q_is_valid indicates if Q can be used for projection.
        trace_sketched = mx.array(0.0, dtype=mx.float32)
        Q_is_valid = False
        Q = mx.zeros((n_rows,0), dtype=mx.float32) # Placeholder for Q if k_sketch is 0

        # 3. Sketching Phase
        if k_sketch > 0:
            Y = m @ S_vectors  # (n_rows, k_sketch), float32
        
            # Check if Y is effectively zero to avoid issues with QR decomposition (e.g., NaNs from mx.linalg.qr(zeros))
            # A very small Frobenius norm for Y could also lead to unstable QR.
            # Using sum of absolute values as a proxy for norm.
            if mx.sum(mx.abs(Y)).item() > 1e-9: # Heuristic: Y is not effectively zero
                try:
                    Q_candidate, _ = mx.linalg.qr(Y) # Q_candidate shape (n_rows, rank(Y))
                    # Ensure Q_candidate does not contain NaNs, which can happen if Y was zero despite the check.
                    if not mx.any(mx.isnan(Q_candidate)).item():
                        Q = Q_candidate
                        if Q.shape[1] > 0: # Check if Q has any columns
                            trace_sketched = mx.trace(Q.T @ m @ Q)  # float32
                            Q_is_valid = True
                    # If Q_candidate has NaNs or QR failed in a way that Q is not useful,
                    # trace_sketched remains 0.0 and Q_is_valid remains False.
                except Exception as e:
                    # Handle potential errors during QR decomposition if Y is ill-conditioned
                    # In such cases, treat as if sketch is zero.
                    # print(f"QR decomposition failed: {e}. Proceeding without sketch.")
                    trace_sketched = mx.array(0.0, dtype=mx.float32)
                    Q_is_valid = False
            # If Y is effectively zero, trace_sketched remains 0.0 and Q_is_valid is False.
        # If k_sketch is 0, trace_sketched is 0.0 and Q_is_valid is False.

        # 4. Residual Phase
        # Estimate trace(m - Q @ Q.T @ m) using T_vectors (if Q is valid)
        # Or trace(m) if Q is not valid or k_sketch was 0.
        trace_residual_estimate = mx.array(0.0, dtype=mx.float32)
        if k_residual > 0:
            T_vectors = generate_rademacher_vectors(n_rows, k_residual) # (n_rows, k_residual), float32
        
            # Calculate t_i.T @ m @ t_i terms
            m_dot_T = m @ T_vectors  # (n_rows, k_residual)
            term1_all_t = mx.sum(T_vectors * m_dot_T, axis=0)  # (k_residual,)

            if Q_is_valid and Q.shape[1] > 0: # If Q is valid and has columns
                # Calculate t_i.T @ Q @ Q.T @ m @ t_i terms
                # This is sum( (Q.T @ t_i) * (Q.T @ m @ t_i) , axis=0 for columns of Q.T@t_i)
                Q_T_T = Q.T @ T_vectors     # (rank(Y) or k_sketch, k_residual)
                Q_T_m_T = Q.T @ m @ T_vectors # (rank(Y) or k_sketch, k_residual)
                term2_all_t = mx.sum(Q_T_T * Q_T_m_T, axis=0)  # (k_residual,)
            
                hutch_terms_for_residual = term1_all_t - term2_all_t
            else:
                # If Q is not valid (e.g., Y was zero, QR failed, or k_sketch was 0),
                # the residual is effectively m itself.
                hutch_terms_for_residual = term1_all_t
            
            trace_residual_estimate = mx.mean(hutch_terms_for_residual) # scalar, float32
        # If k_residual is 0, trace_residual_estimate remains 0.0.

        # 5. Total Trace Estimate
        total_trace_estimate = trace_sketched + trace_residual_estimate
    
        return total_trace_estimate.astype(mx.float32)




    # Test case 1: Identity matrix
    n_dim = 100
    m_identity = mx.eye(n_dim, dtype=mx.float32)
    true_trace_identity = mx.trace(m_identity).item() # Should be n_dim (100.0)

    k_vectors = 300 # Number of random vectors

    print(f"True trace of {n_dim}x{n_dim} identity matrix: {true_trace_identity}")

    # Standard Hutchinson
    est_trace_hutch_identity = hutch(m_identity, PositiveInt(k_vectors)).item()
    print(f"Standard Hutch estimate (k={k_vectors}): {est_trace_hutch_identity:.4f}, Error: {abs(est_trace_hutch_identity - true_trace_identity):.4f}")

    # Variance-Reduced Hutchinson
    est_trace_vr_hutch_identity = hutch_variance_reduced(m_identity, PositiveInt(k_vectors)).item()
    print(f"Variance-Reduced Hutch estimate (k={k_vectors}): {est_trace_vr_hutch_identity:.4f}, Error: {abs(est_trace_vr_hutch_identity - true_trace_identity):.4f}")

    # Test case 2: Random matrix
    mx.random.seed(42)
    m_random = mx.random.uniform(low=-1.0, high=1.0, shape=(n_dim, n_dim)).astype(mx.float32)
    m_random = (m_random + m_random.T) / 2.0 # Make it symmetric for stable trace
    true_trace_random = mx.trace(m_random).item()

    print(f"\nTrue trace of {n_dim}x{n_dim} random symmetric matrix: {true_trace_random:.4f}")

    est_trace_hutch_random = hutch(m_random, PositiveInt(k_vectors)).item()
    print(f"Standard Hutch estimate (k={k_vectors}): {est_trace_hutch_random:.4f}, Error: {abs(est_trace_hutch_random - true_trace_random):.4f}")

    est_trace_vr_hutch_random = hutch_variance_reduced(m_random, PositiveInt(k_vectors)).item()
    print(f"Variance-Reduced Hutch estimate (k={k_vectors}): {est_trace_vr_hutch_random:.4f}, Error: {abs(est_trace_vr_hutch_random - true_trace_random):.4f}")

    # Test case 3: Zero matrix
    m_zero = mx.zeros((n_dim, n_dim), dtype=mx.float32)
    true_trace_zero = mx.trace(m_zero).item() # Should be 0.0
    print(f"\nTrue trace of {n_dim}x{n_dim} zero matrix: {true_trace_zero:.4f}")

    est_trace_hutch_zero = hutch(m_zero, PositiveInt(k_vectors)).item()
    print(f"Standard Hutch estimate (k={k_vectors}): {est_trace_hutch_zero:.4f}, Error: {abs(est_trace_hutch_zero - true_trace_zero):.4f}")

    est_trace_vr_hutch_zero = hutch_variance_reduced(m_zero, PositiveInt(k_vectors)).item()
    print(f"Variance-Reduced Hutch estimate (k={k_vectors}): {est_trace_vr_hutch_zero:.4f}, Error: {abs(est_trace_vr_hutch_zero - true_trace_zero):.4f}")

    # Test with small k values
    k_small_values = [1, 2, 3, 5]
    print("\nTesting with small k values for variance-reduced estimator on identity matrix:")
    for k_val in k_small_values:
        est_trace_vr_small_k = hutch_variance_reduced(m_identity, PositiveInt(k_val)).item()
        print(f"  k={k_val}: Estimate = {est_trace_vr_small_k:.4f}, Error = {abs(est_trace_vr_small_k - true_trace_identity):.4f}")
        k_sketch_calc = (2 * k_val) // 3
        k_residual_calc = k_val - k_sketch_calc
        print(f"     k_sketch={k_sketch_calc}, k_residual={k_residual_calc}")


    return (hutch_variance_reduced,)


@app.cell
def _(mo):
    mo.md(r"""## Exchangeable Trace Estimators""")
    return


@app.cell
def _():
    return


@app.cell
def _(mo):
    mo.md(r"""##  Comparisons""")
    return


@app.cell
def _(PositiveInt, hutch, hutch_variance_reduced, mx):
    import time
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    import numpy as np # Using numpy for eigenvalue generation simplicity, then convert to mx

    # Define matrix size and k values to test
    n_comparison: PositiveInt = 500
    k_values_comparison = [10, 20, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

    # --- Matrix Generation Functions ---

    def generate_exponential_decay_matrix(n: int) -> mx.array:
        """Generates a diagonal matrix with exponentially decaying eigenvalues."""
        # Use numpy to generate eigenvalues, then convert to MLX
        eigenvalues = np.exp(-np.linspace(0, 5, n)) # Decays from exp(0)=1 to exp(-5)
        return mx.diag(mx.array(eigenvalues, dtype=mx.float32))

    def generate_uniform_spectrum_matrix(n: int) -> mx.array:
        """Generates a diagonal matrix with uniform eigenvalues."""
        eigenvalues = np.ones(n) # All eigenvalues are 1
        return mx.diag(mx.array(eigenvalues, dtype=mx.float32))

    def generate_intermediate_decay_matrix(n: int, slow_decay_fraction: float = 0.1) -> mx.array:
        """Generates a diagonal matrix with eigenvalues decaying slowly then sharply."""
        num_slow = int(n * slow_decay_fraction)
        num_sharp = n - num_slow
    
        # Slow decay (e.g., constant or very slow linear)
        slow_eigenvalues = np.ones(num_slow) # Constant for simplicity
    
        # Sharp decay (exponential)
        sharp_eigenvalues = np.exp(-np.linspace(0, 5, num_sharp))
    
        eigenvalues = np.concatenate([slow_eigenvalues, sharp_eigenvalues])
        return mx.diag(mx.array(eigenvalues, dtype=mx.float32))

    # --- Comparison Logic ---

    matrix_types = {
        "Exponential Decay": generate_exponential_decay_matrix,
        "Uniform Spectrum": generate_uniform_spectrum_matrix,
        "Intermediate Decay": generate_intermediate_decay_matrix,
    }

    results = []

    for matrix_name, matrix_generator in matrix_types.items():
        print(f"Testing matrix type: {matrix_name}")
    
        # Generate matrix and calculate true trace
        M = matrix_generator(n_comparison)
        true_trace_M = mx.trace(M).item()
        print(f"  True Trace: {true_trace_M:.4f}")

        for k in k_values_comparison:
            k_pos = PositiveInt(k) # Ensure k is PositiveInt for function calls
        
            # Test Standard Hutchinson
            start_time_hutch = time.perf_counter()
            estimated_trace_hutch = hutch(M, k_pos).item()
            end_time_hutch = time.perf_counter()
            runtime_hutch = end_time_hutch - start_time_hutch
            error_hutch = abs(estimated_trace_hutch - true_trace_M)

            # Test Variance-Reduced Hutchinson
            start_time_vr_hutch = time.perf_counter()
            estimated_trace_vr_hutch = hutch_variance_reduced(M, k_pos).item()
            end_time_vr_hutch = time.perf_counter()
            runtime_vr_hutch = end_time_vr_hutch - start_time_vr_hutch
            error_vr_hutch = abs(estimated_trace_vr_hutch - true_trace_M)
        
            results.append({
                "matrix_type": matrix_name,
                "k": k,
                "method": "Standard Hutch",
                "error": error_hutch,
                "runtime": runtime_hutch,
            })
            results.append({
                "matrix_type": matrix_name,
                "k": k,
                "method": "Variance-Reduced Hutch",
                "error": error_vr_hutch,
                "runtime": runtime_vr_hutch,
            })
            # print(f"    k={k}: Hutch Error={error_hutch:.4f}, VR Hutch Error={error_vr_hutch:.4f}")

    # --- Plotting ---

    # Create subplots: one row, three columns for each matrix type
    fig = make_subplots(rows=len(matrix_types), cols=2, 
                        subplot_titles=[f"{name} - Error vs k" for name in matrix_types] + 
                                       [f"{name} - Runtime vs k" for name in matrix_types],
                        horizontal_spacing=0.1, vertical_spacing=0.15)

    row = 1
    for matrix_name in matrix_types:
        # Filter results for the current matrix type
        matrix_results = [r for r in results if r["matrix_type"] == matrix_name]
    
        # Separate results by method
        hutch_results = [r for r in matrix_results if r["method"] == "Standard Hutch"]
        vr_hutch_results = [r for r in matrix_results if r["method"] == "Variance-Reduced Hutch"]

        # Sort by k for plotting
        hutch_results.sort(key=lambda x: x["k"])
        vr_hutch_results.sort(key=lambda x: x["k"])

        # Add Error trace
        fig.add_trace(go.Scatter(x=[r["k"] for r in hutch_results], y=[r["error"] for r in hutch_results],
                                 mode='lines+markers', name='Standard Hutch', legendgroup=matrix_name, showlegend=(row==1)),
                      row=row, col=1)
        fig.add_trace(go.Scatter(x=[r["k"] for r in vr_hutch_results], y=[r["error"] for r in vr_hutch_results],
                                 mode='lines+markers', name='Variance-Reduced Hutch', legendgroup=matrix_name, showlegend=(row==1)),
                      row=row, col=1)

        # Add Runtime trace
        fig.add_trace(go.Scatter(x=[r["k"] for r in hutch_results], y=[r["runtime"] for r in hutch_results],
                                 mode='lines+markers', name='Standard Hutch', legendgroup=matrix_name, showlegend=False), # Hide legend for runtime plots
                      row=row, col=2)
        fig.add_trace(go.Scatter(x=[r["k"] for r in vr_hutch_results], y=[r["runtime"] for r in vr_hutch_results],
                                 mode='lines+markers', name='Variance-Reduced Hutch', legendgroup=matrix_name, showlegend=False), # Hide legend for runtime plots
                      row=row, col=2)

        # Update axes labels for the current row
        fig.update_xaxes(title_text="Number of Test Vectors (k)", row=row, col=1)
        fig.update_yaxes(title_text="Absolute Error", row=row, col=1)
        fig.update_xaxes(title_text="Number of Test Vectors (k)", row=row, col=2)
        fig.update_yaxes(title_text="Runtime (s)", row=row, col=2)

        row += 1

    # Update layout
    fig.update_layout(height=400 * len(matrix_types), width=1000,
                      title_text=f"Trace Estimation Comparison (Matrix Size = {n_comparison})",
                      hovermode='closest')

    fig
    return


if __name__ == "__main__":
    app.run()
