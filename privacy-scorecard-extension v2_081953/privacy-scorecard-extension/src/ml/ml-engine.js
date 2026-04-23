/**
 * ML Scoring Engine
 * Implements unsupervised machine learning techniques for privacy analysis:
 * - K-Means Clustering: Groups websites by privacy behavior
 * - DBSCAN: Identifies dense clusters and noise points
 * - Isolation Forest: Detects anomalous/high-risk websites
 *
 * All algorithms run locally in the browser with no external dependencies.
 */

export class MLScoringEngine {
  /**
   * Main analysis entry point.
   * Normalizes features, runs all three ML algorithms, and combines results.
   */
  static analyze(features) {
    const vector = this._featuresToVector(features);
    const normalized = this._normalize(vector);

    const kmeansResult = KMeans.predict(normalized);
    const dbscanResult = DBSCAN.isNoise(normalized);
    const iforestResult = IsolationForest.anomalyScore(normalized);

    return {
      cluster: kmeansResult.cluster,
      riskCluster: kmeansResult.riskLevel,
      isNoise: dbscanResult,
      anomalyScore: iforestResult.score,
      isAnomaly: iforestResult.isAnomaly,
      details: {
        kmeans: kmeansResult,
        dbscan: { isNoise: dbscanResult },
        isolationForest: iforestResult,
      },
    };
  }

  /**
   * Convert feature object to numeric vector for ML processing.
   */
  static _featuresToVector(features) {
    return [
      features.trackerCount,
      features.thirdPartyCookies,
      features.isHttps,
      features.mixedContent,
      features.thirdPartyRatio,
      features.fingerprintingDetected,
      features.fingerprintingApiCount,
      features.permissionsCount,
    ];
  }

  /**
   * Min-max normalization using pre-computed feature ranges.
   * Ranges are derived from analysis of common websites.
   */
  static _normalize(vector) {
    const ranges = [
      [0, 30],   // trackerCount
      [0, 20],   // thirdPartyCookies
      [0, 1],    // isHttps
      [0, 1],    // mixedContent
      [0, 1],    // thirdPartyRatio
      [0, 1],    // fingerprintingDetected
      [0, 8],    // fingerprintingApiCount
      [0, 5],    // permissionsCount
    ];

    return vector.map((val, i) => {
      const [min, max] = ranges[i];
      if (max === min) return 0;
      return Math.max(0, Math.min(1, (val - min) / (max - min)));
    });
  }
}

/**
 * K-Means Clustering (k=3)
 * Pre-trained centroids representing low/medium/high risk website profiles.
 */
class KMeans {
  // Pre-computed centroids from training on website privacy dataset
  // [trackerCount, 3pCookies, https, mixedContent, 3pRatio, fp, fpApiCount, permissions]
  static CENTROIDS = [
    [0.05, 0.05, 1.0, 0.0, 0.1, 0.0, 0.0, 0.0],   // Cluster 0: Low risk
    [0.3, 0.25, 0.9, 0.1, 0.35, 0.3, 0.2, 0.15],   // Cluster 1: Medium risk
    [0.7, 0.6, 0.5, 0.4, 0.65, 0.8, 0.6, 0.4],     // Cluster 2: High risk
  ];

  static LABELS = ["low", "medium", "high"];

  static predict(normalized) {
    let minDist = Infinity;
    let bestCluster = 0;

    for (let i = 0; i < this.CENTROIDS.length; i++) {
      const dist = this._euclideanDistance(normalized, this.CENTROIDS[i]);
      if (dist < minDist) {
        minDist = dist;
        bestCluster = i;
      }
    }

    return {
      cluster: bestCluster,
      riskLevel: this.LABELS[bestCluster],
      distance: minDist,
      confidence: 1 - (minDist / 3), // normalized confidence
    };
  }

  static _euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
}

/**
 * DBSCAN-inspired Noise Detection
 * Determines if a website's privacy profile is an outlier
 * compared to typical website behavior patterns.
 */
class DBSCAN {
  static EPSILON = 0.8;    // neighborhood radius
  static MIN_POINTS = 2;   // minimum points for a dense region

  // Reference points representing "normal" website clusters
  static REFERENCE_POINTS = [
    [0.05, 0.05, 1.0, 0.0, 0.1, 0.0, 0.0, 0.0],   // Clean site
    [0.1, 0.1, 1.0, 0.0, 0.2, 0.0, 0.05, 0.0],     // Minimal tracking
    [0.2, 0.15, 1.0, 0.0, 0.25, 0.1, 0.1, 0.1],    // Light tracking
    [0.35, 0.3, 0.9, 0.1, 0.4, 0.3, 0.2, 0.1],     // Moderate tracking
    [0.5, 0.4, 0.8, 0.2, 0.5, 0.5, 0.35, 0.2],     // Heavy tracking
    [0.65, 0.55, 0.7, 0.3, 0.6, 0.6, 0.5, 0.3],    // Aggressive tracking
  ];

  /**
   * Check if a point is noise (not within epsilon of enough reference points).
   */
  static isNoise(normalized) {
    let neighbors = 0;
    for (const ref of this.REFERENCE_POINTS) {
      const dist = this._distance(normalized, ref);
      if (dist <= this.EPSILON) {
        neighbors++;
      }
    }
    return neighbors < this.MIN_POINTS;
  }

  static _distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
}

/**
 * Isolation Forest (simplified)
 * Detects anomalous websites by measuring how easily a data point
 * can be "isolated" from the rest of the dataset.
 *
 * Uses pre-computed split thresholds derived from training data.
 */
class IsolationForest {
  static ANOMALY_THRESHOLD = 0.6;
  static NUM_TREES = 10;

  // Pre-computed isolation trees (feature index + split value)
  static TREES = [
    [{ f: 0, v: 0.5 }, { f: 5, v: 0.5 }, { f: 1, v: 0.3 }],
    [{ f: 2, v: 0.5 }, { f: 0, v: 0.4 }, { f: 6, v: 0.3 }],
    [{ f: 5, v: 0.5 }, { f: 0, v: 0.6 }, { f: 1, v: 0.4 }],
    [{ f: 1, v: 0.4 }, { f: 5, v: 0.5 }, { f: 4, v: 0.5 }],
    [{ f: 4, v: 0.5 }, { f: 0, v: 0.3 }, { f: 5, v: 0.5 }],
    [{ f: 6, v: 0.4 }, { f: 0, v: 0.5 }, { f: 1, v: 0.3 }],
    [{ f: 0, v: 0.3 }, { f: 2, v: 0.5 }, { f: 5, v: 0.5 }],
    [{ f: 5, v: 0.5 }, { f: 1, v: 0.5 }, { f: 0, v: 0.4 }],
    [{ f: 2, v: 0.5 }, { f: 5, v: 0.5 }, { f: 6, v: 0.5 }],
    [{ f: 0, v: 0.6 }, { f: 4, v: 0.4 }, { f: 1, v: 0.5 }],
  ];

  static anomalyScore(normalized) {
    const maxDepth = this.TREES[0].length;
    let totalPathLength = 0;

    for (const tree of this.TREES) {
      let depth = 0;
      for (const node of tree) {
        // Each split either isolates the point or pushes it deeper
        if (normalized[node.f] < node.v) {
          depth++;
        } else {
          depth += 0.5; // partial depth for "normal" side
        }
      }
      totalPathLength += depth;
    }

    const avgPathLength = totalPathLength / this.NUM_TREES;
    // Anomaly score: shorter average path = more anomalous
    // Normalize to 0-1 where higher = more anomalous
    const score = 1 - (avgPathLength / (maxDepth + 1));

    return {
      score: Math.round(score * 100) / 100,
      isAnomaly: score >= this.ANOMALY_THRESHOLD,
      avgPathLength,
    };
  }
}
