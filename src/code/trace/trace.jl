"""
    hutchinson(A, m)

Estimate `tr(A)` using `m` independent Rademacher probes.

Each probe ξ has independent entries taking values ±1
with probability 1/2.
"""
function hutchinson(A::AbstractMatrix, m::Integer)
    n, n2 = size(A)
    n == n2 || throw(ArgumentError("A must be square"))
    m > 0 || throw(ArgumentError("m must be positive"))

    estimate = zero(eltype(A))

    for _ in 1:m
        ξ = rand((-1, 1), n)
        estimate += dots(ξ, A * ξ)
    end

    return estimate / m
end

# trace_estimators.jl
#
# Advanced stochastic trace estimators:
#   * hutchpp    — Hutch++              (Meyer, Musco, Musco, Woodruff 2021)
#   * xtrace     — XTrace               (Epperly, Tropp, Webber 2023)
#   * xnystrace  — XNYSTrace (PSD only) (Epperly, Tropp, Webber 2023)
#
# Plus the basic Girard–Hutchinson estimator as a baseline.
#
# All estimators accept anything that supports `A * X` (matvecs) and,
# where noted, `size(A, 1)`. Probes are standard Gaussian (isotropic).

using LinearAlgebra
using Random
using Statistics

"""
    girard_hutchinson(A, m::Integer; rng::AbstractRNG = Random.default_rng())

Basic Monte Carlo trace estimator: x̂ = (1/m) Σₖ ξₖ' A ξₖ.
Uses `m` matvecs. Error decays like O(1/√m).
"""
function girard_hutchinson(A, m::Integer; rng::AbstractRNG = Random.default_rng())
    n = size(A, 1)
    X = randn(rng, n, m)
    return dot(X, A * X) / m          # Σₖ ξₖ'Aξₖ = ⟨X, AX⟩
end

"""
    hutchpp(A, m::Integer; rng::AbstractRNG = Random.default_rng())

Hutch++ trace estimator. `m` is the total matvec budget and must be
divisible by 3: m/3 probes build a sketch of A's dominant subspace
(whose trace is computed exactly), m/3 probes estimate the trace of the
residual with Girard–Hutchinson, and m/3 matvecs are spent on A*Q.

Unbiased, with error decaying like O(1/m) — quadratically better than
Girard–Hutchinson's O(1/√m).
"""
function hutchpp(A, m::Integer; rng::AbstractRNG = Random.default_rng())
    m % 3 == 0 || throw(ArgumentError("budget m must be divisible by 3"))
    n = size(A, 1)
    k = m ÷ 3

    S = randn(rng, n, k)                  # sketching probes
    G = randn(rng, n, k)                  # residual probes

    Q = Matrix(qr(A * S).Q)               # orthonormal basis for range sketch
    Gp = G - Q * (Q' * G)                 # project residual probes off the sketch

    return tr(Q' * (A * Q)) + dot(Gp, A * Gp) / k
end

"""
    xtrace(A, m; rng) -> (x̂, êrr)

XTrace estimator. `m` is the matvec budget and must be even; m/2 Gaussian
probes are drawn. For each probe ξₖ, a sketch is built from the *other*
m/2 - 1 probes and ξₖ estimates the residual trace; the m/2 leave-one-out
estimates are averaged. This symmetrizes Hutch++ with respect to probe
exchange, which provably lowers variance, and yields a free posterior
error estimate (the standard error of the leave-one-out estimates).

Returns the trace estimate `x̂` and error estimate `êrr`.

Note: this is a direct transcription of the pseudocode — one QR per probe,
O(m) extra matvecs for the Q'AQ terms. The reference implementation gets
the same numbers with a single QR plus rank-one downdates.
"""
function xtrace(A, m::Integer; rng::AbstractRNG = Random.default_rng())
    m % 2 == 0 || throw(ArgumentError("budget m must be even"))
    n = size(A, 1)
    k = m ÷ 2

    X = randn(rng, n, k)
    Y = A * X                             # all matvecs with the probes, up front

    ests = zeros(k)
    for j in 1:k
        keep = [i for i in 1:k if i != j]
        Q = Matrix(qr(Y[:, keep]).Q)      # sketch from all probes except ξⱼ
        ξ = X[:, j]
        r = ξ - Q * (Q' * ξ)              # r = (I - QQ')ξ
        ests[j] = tr(Q' * (A * Q)) + dot(r, A * r)
    end

    x̂ = mean(ests)
    êrr = sqrt(sum(abs2, ests .- x̂) / (k * (k - 1)))
    return x̂, êrr
end

"""
    xnystrace(A, m; rng) -> (x̂, êrr)

XNYSTrace estimator for **positive semidefinite** A. Same leave-one-out
exchangeable design as XTrace, but the sketch is the Nyström approximation
    A⟨X₋ₖ⟩ = (AX₋ₖ)(X₋ₖ' A X₋ₖ)⁺(AX₋ₖ)',
which reuses the probe matvecs, so all `m` matvecs go into Y = AX.

The n×n Nyström approximation is never formed explicitly; its trace and
quadratic forms are evaluated through the m-1 dimensional core matrix.

Returns the trace estimate `x̂` and posterior error estimate `êrr`.
"""
function xnystrace(A, m::Integer; rng::AbstractRNG = Random.default_rng())
    n = size(A, 1)

    X = randn(rng, n, m)
    Y = A * X                             # the only matvecs performed

    ests = zeros(m)
    for j in 1:m
        keep = [i for i in 1:m if i != j]
        Xj = X[:, keep]
        Yj = Y[:, keep]

        core = pinv(Xj' * Yj)             # (X₋ⱼ' A X₋ⱼ)⁺, an (m-1)×(m-1) matrix

        # tr(Â) = tr(Yⱼ core Yⱼ') = tr(core (Yⱼ'Yⱼ))
        t_sketch = tr(core * (Yj' * Yj))

        # ξⱼ'(A - Â)ξⱼ = ξⱼ'Aξⱼ - v' core v with v = Yⱼ'ξⱼ
        ξ = X[:, j]
        v = Yj' * ξ
        t_resid = dot(ξ, Y[:, j]) - dot(v, core * v)

        ests[j] = t_sketch + t_resid
    end

    x̂ = mean(ests)
    êrr = sqrt(sum(abs2, ests .- x̂) / (m * (m - 1)))
    return x̂, êrr
end

# ─────────────────────────────────────────────────────────────────────────────
# Demo: compare the estimators on a PSD matrix with fast spectral decay,
# the regime where sketch-based estimators shine.
# ─────────────────────────────────────────────────────────────────────────────
function demo(; n = 500, m = 48, decay = 0.9, seed = 0)
    rng = MersenneTwister(seed)

    U = Matrix(qr(randn(rng, n, n)).Q)
    λ = decay .^ (0:n-1)
    A = U * Diagonal(λ) * U'              # PSD, eigenvalues decay geometrically

    truth = sum(λ)
    println("true trace        : ", truth)
    println("girard-hutchinson : ", girard_hutchinson(A, m; rng))
    println("hutch++           : ", hutchpp(A, m; rng))

    x̂, e = xtrace(A, m; rng)
    println("xtrace            : ", x̂, "  ± ", e)

    x̂, e = xnystrace(A, m; rng)
    println("xnystrace         : ", x̂, "  ± ", e)
end

# Run the demo when executed as a script.
if abspath(PROGRAM_FILE) == @__FILE__
    demo()
end
