import { getConfig, getPublishedTopics } from './store';

// Master topic pool — deep, specific, engineering-grade topics per category
const TOPIC_POOL: Record<string, string[]> = {
    'Cybersecurity': [
        'IAM Policy Evaluation Flow and Permission Boundaries',
        'Zero Trust Architecture: Policy Enforcement Points',
        'SAML vs OAuth2 vs OIDC: Protocol Comparison and Attack Surfaces',
        'Kubernetes RBAC Privilege Escalation Vectors',
        'TLS 1.3 Handshake Internals and Downgrade Protection',
        'Certificate Transparency Logs and CT Monitoring',
        'DNS Rebinding Attacks and Browser-Side Mitigations',
        'SSRF Exploitation Techniques in Cloud Environments',
        'JWT Token Security: Signing, Validation, and Common Pitfalls',
        'Web Application Firewall Bypass Techniques',
        'Supply Chain Attack Vectors in CI/CD Pipelines',
        'Container Escape Techniques and Kernel Exploits',
        'Memory Corruption Vulnerabilities: Stack vs Heap Exploitation',
        'API Security: Broken Object Level Authorization (BOLA)',
        'Secrets Management Architecture and Vault Patterns',
        'Kerberos Authentication Flow and Golden Ticket Attacks',
        'Cross-Site Request Forgery in Modern SPAs',
        'Race Condition Vulnerabilities in Web Applications',
        'Subdomain Takeover Detection and Prevention',
        'Cryptographic Agility and Post-Quantum Migration',
        'Network Segmentation Strategies for Zero Trust',
        'Incident Response Automation with SOAR Platforms',
        'Threat Modeling with STRIDE and PASTA Frameworks',
        'Browser Security Model: Same-Origin Policy Internals',
        'Hardware Security Modules (HSM) Integration Patterns',
        'OAuth 2.0 Device Authorization Grant Flow Security',
        'DNS-over-HTTPS Security Implications',
        'Reverse Proxy Security Hardening Checklist',
        'Cloud IAM Misconfiguration Patterns Across AWS, Azure, GCP',
        'Malware Sandboxing and Dynamic Analysis Architecture',
    ],
    'Cloud Architecture': [
        'VPC Peering vs Transit Gateway: Architecture Trade-offs',
        'Multi-Region Active-Active Database Architecture',
        'Cloud-Native Service Mesh Architecture with Istio',
        'Serverless Cold Start Optimization Strategies',
        'Event-Driven Architecture with EventBridge and SNS',
        'Cloud Cost Optimization: Reserved vs Spot vs On-Demand',
        'Data Lake Architecture: Medallion Pattern Implementation',
        'Cloud Storage Tiering and Lifecycle Policies',
        'Multi-Cloud Networking Architecture Patterns',
        'Cloud-Native Secrets Management with KMS Integration',
        'Global Load Balancing and GeoDNS Architecture',
        'Cloud Migration Strategies: The 7 Rs Framework',
        'Disaster Recovery Architecture: RPO and RTO Planning',
        'AWS Well-Architected Framework: Reliability Pillar Deep Dive',
        'Cloud-Native Database Selection Matrix',
        'API Gateway Architecture Patterns and Rate Limiting',
        'Cloud Compliance Architecture: SOC 2 and HIPAA',
        'Object Storage Consistency Models and CAP Trade-offs',
        'Cloud Network Security Groups vs NACLs vs Firewalls',
        'Autoscaling Policy Design: Predictive vs Reactive',
        'CDN Architecture: Edge Computing and Cache Invalidation',
        'Cloud-Native Batch Processing Architecture',
        'Hybrid Cloud Connectivity: VPN vs Direct Connect',
        'Cloud Resource Tagging Strategy and Governance',
        'Cloud-Native Pub/Sub Architecture Patterns',
    ],
    'DevOps': [
        'GitOps Workflow Architecture with ArgoCD',
        'CI/CD Pipeline Security: SAST, DAST, and SCA Integration',
        'Infrastructure as Code Drift Detection and Remediation',
        'Blue-Green vs Canary vs Rolling Deployment Strategies',
        'Observability Pipeline Architecture: Logs, Metrics, Traces',
        'Feature Flag Architecture and Progressive Delivery',
        'Container Image Scanning and Supply Chain Security',
        'Immutable Infrastructure Pattern Implementation',
        'Platform Engineering: Internal Developer Platform Design',
        'Chaos Engineering: Failure Injection Strategies',
        'Release Management Automation with Semantic Versioning',
        'Multi-Environment Promotion Strategy',
        'DevSecOps: Shifting Security Left in CI/CD',
        'Artifact Repository Management with Nexus/Artifactory',
        'Configuration Management: Ansible vs Puppet vs Chef',
        'Pipeline as Code: Declarative vs Scripted Pipelines',
        'Environment Provisioning Automation Patterns',
        'DevOps Metrics: DORA Framework Implementation',
        'Database Migration Strategies in CI/CD Pipelines',
        'Service Catalog Architecture for Self-Service DevOps',
        'Infrastructure Testing: Unit, Integration, and Compliance',
        'GitOps Multi-Tenancy Architecture',
        'Deployment Rollback Strategies and Automated Recovery',
        'Build Caching Strategies for Faster CI/CD',
        'Trunk-Based Development vs GitFlow Analysis',
    ],
    'Networking': [
        'BGP Route Hijacking: Detection and Prevention',
        'Software-Defined Networking (SDN) Architecture',
        'Network Function Virtualization (NFV) Design',
        'MPLS Architecture and Traffic Engineering',
        'IPv6 Transition Mechanisms and Dual-Stack Architecture',
        'DNS Architecture: Recursive vs Authoritative Resolution',
        'Load Balancer Architecture: L4 vs L7 Deep Dive',
        'Network Observability with eBPF',
        'WireGuard VPN Architecture and Performance',
        'TCP Congestion Control Algorithms Comparison',
        'QUIC Protocol Architecture and HTTP/3',
        'Network Address Translation (NAT) Traversal Techniques',
        'Spine-Leaf Data Center Network Topology',
        'Network Traffic Analysis and DPI Architecture',
        'Service Discovery in Distributed Systems',
        'mTLS Architecture and Certificate Rotation',
        'Network Automation with NETCONF and YANG',
        'Traffic Shaping and QoS Policy Design',
        'ARP Spoofing Detection and Prevention',
        'Network Telemetry with gNMI and OpenConfig',
    ],
    'System Design': [
        'Distributed Rate Limiter Architecture',
        'Event Sourcing and CQRS Pattern Implementation',
        'Consistent Hashing for Distributed Systems',
        'Distributed Lock Manager Architecture',
        'Message Queue Architecture: Kafka vs RabbitMQ vs Pulsar',
        'Database Sharding Strategies and Rebalancing',
        'Circuit Breaker Pattern Implementation',
        'Distributed Tracing Architecture',
        'Write-Ahead Logging (WAL) in Database Systems',
        'Leader Election Algorithms in Distributed Systems',
        'Bloom Filter Architecture and Applications',
        'Time-Series Database Architecture',
        'Conflict-Free Replicated Data Types (CRDTs)',
        'Distributed Cache Architecture: Redis Cluster Design',
        'Saga Pattern for Distributed Transactions',
        'Content Delivery Network Design from Scratch',
        'Search Engine Architecture: Inverted Index Design',
        'Notification System Architecture at Scale',
        'URL Shortener Architecture: Complete System Design',
        'Real-Time Analytics Pipeline Architecture',
        'Gossip Protocol in Distributed Systems',
        'Vector Clock and Causal Ordering',
        'LSM-Tree Storage Engine Architecture',
        'Raft Consensus Algorithm Deep Dive',
        'Back-Pressure Handling in Reactive Systems',
    ],
    'Authentication & Authorization': [
        'OAuth 2.0 Token Validation Workflow',
        'OpenID Connect Discovery and Dynamic Registration',
        'Multi-Factor Authentication Architecture',
        'Session Management: Stateful vs Stateless Patterns',
        'RBAC vs ABAC vs ReBAC Authorization Models',
        'Single Sign-On Architecture with SAML 2.0',
        'API Key Management and Rotation Strategies',
        'Passwordless Authentication Flow Design',
        'Token Refresh Architecture and Sliding Expiration',
        'Fine-Grained Authorization with Open Policy Agent',
        'WebAuthn and FIDO2 Implementation Architecture',
        'API Authentication Patterns: Bearer vs MAC vs HMAC',
        'Identity Federation Architecture Across Organizations',
        'Delegated Authorization with OAuth 2.0 Scopes',
        'Certificate-Based Authentication (mTLS) Architecture',
        'Authorization Code Flow with PKCE Deep Dive',
        'Consent Management Architecture for Privacy Compliance',
        'Step-Up Authentication Pattern Implementation',
        'Token Binding and Proof-of-Possession Tokens',
        'Decentralized Identity and Verifiable Credentials',
    ],
    'Observability': [
        'Observability vs Monitoring: Architecture Differences',
        'OpenTelemetry Collector Architecture and Pipeline',
        'Log Aggregation Architecture: ELK vs Loki vs CloudWatch',
        'Distributed Tracing with Jaeger and Zipkin',
        'Custom Metrics Pipeline Design with Prometheus',
        'SLI/SLO/SLA Definition and Error Budget Policies',
        'Alert Fatigue Reduction and Intelligent Alerting',
        'APM Architecture: End-to-End Request Tracing',
        'Continuous Profiling Architecture',
        'Synthetic Monitoring Architecture and Implementation',
        'Log Correlation Across Microservices',
        'Real User Monitoring (RUM) Architecture',
        'Anomaly Detection in Time-Series Metrics',
        'Dashboard Design Principles for Operational Excellence',
        'Observability Data Pipeline Cost Optimization',
    ],
    'Containerization': [
        'Container Runtime Architecture: containerd vs CRI-O',
        'Kubernetes Network Policy Architecture',
        'Pod Security Standards and Admission Controllers',
        'Kubernetes Operator Pattern Implementation',
        'Container Image Layer Optimization Strategies',
        'Kubernetes Horizontal Pod Autoscaler Internals',
        'Service Mesh Data Plane Architecture',
        'Kubernetes Multi-Cluster Federation',
        'Container Storage Interface (CSI) Architecture',
        'Kubernetes Admission Webhook Architecture',
        'Sidecar Pattern vs Ambient Mesh Architecture',
        'Kubernetes Resource Quota and Limit Range Design',
        'Container Networking: Bridge vs Overlay vs Host',
        'Kubernetes Custom Resource Definition (CRD) Design',
        'Init Container and Startup Probe Patterns',
        'Kubernetes Scheduling: Affinity and Anti-Affinity',
        'Pod Disruption Budget and Graceful Shutdown',
        'Kubernetes Ingress Architecture Comparison',
        'Container Vulnerability Scanning Pipeline',
        'Kubernetes Secrets Management Architecture',
    ],
    'Infrastructure as Code': [
        'Terraform State Management and Locking Architecture',
        'Terraform Module Design Patterns and Composition',
        'Pulumi vs Terraform: Architecture Comparison',
        'CloudFormation Stack Architecture and Nested Stacks',
        'Infrastructure Testing with Terratest',
        'Policy as Code with Sentinel and Rego',
        'GitOps for Infrastructure: Terraform + ArgoCD',
        'Infrastructure Dependency Graph Resolution',
        'Terraform Provider Architecture and Plugin System',
        'CDK Architecture: Constructs, Stacks, and Apps',
        'Infrastructure State Drift Detection Strategies',
        'Multi-Account Infrastructure Architecture',
        'Infrastructure Pipeline: Plan, Apply, Validate',
        'Terraform Workspace vs Directory-Based Isolation',
        'Self-Service Infrastructure with Backstage Templates',
    ],
};

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80);
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function selectCategoryWeighted(config: ReturnType<typeof getConfig>): string {
    const categories = config.categories;
    const weights = categories.map(c => config.categoryWeights[c] || 10);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < categories.length; i++) {
        random -= weights[i];
        if (random <= 0) return categories[i];
    }
    return categories[categories.length - 1];
}

export function selectTopics(count: number): Array<{
    id: string;
    title: string;
    category: string;
    slug: string;
    filename: string;
}> {
    const config = getConfig();
    const publishedTopics = getPublishedTopics();
    const publishedTitles = new Set(
        publishedTopics.map(t => t.title.toLowerCase().trim())
    );
    const selectedTitles = new Set<string>();
    const results: Array<{
        id: string;
        title: string;
        category: string;
        slug: string;
        filename: string;
    }> = [];

    let attempts = 0;
    const maxAttempts = count * 20;

    while (results.length < count && attempts < maxAttempts) {
        attempts++;
        const category = selectCategoryWeighted(config);
        const pool = TOPIC_POOL[category];
        if (!pool || pool.length === 0) continue;

        const topic = pool[Math.floor(Math.random() * pool.length)];
        const normalizedTopic = topic.toLowerCase().trim();

        if (publishedTitles.has(normalizedTopic)) continue;
        if (selectedTitles.has(normalizedTopic)) continue;

        selectedTitles.add(normalizedTopic);
        const slug = generateSlug(topic);
        results.push({
            id: generateId(),
            title: topic,
            category,
            slug,
            filename: `${slug}.md`,
        });
    }

    return results;
}

export function getCategoryForDisplay(category: string): string {
    const colorMap: Record<string, string> = {
        'Cybersecurity': '#ef4444',
        'Cloud Architecture': '#3b82f6',
        'DevOps': '#10b981',
        'Networking': '#f59e0b',
        'System Design': '#8b5cf6',
        'Authentication & Authorization': '#ec4899',
        'Observability': '#06b6d4',
        'Containerization': '#6366f1',
        'Infrastructure as Code': '#14b8a6',
    };
    return colorMap[category] || '#6b7280';
}

export function getAllCategories(): string[] {
    return Object.keys(TOPIC_POOL);
}

export function getTopicPoolSize(): number {
    return Object.values(TOPIC_POOL).reduce((sum, pool) => sum + pool.length, 0);
}
