SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: mars_company_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mars_company_ids() RETURNS bigint[]
    LANGUAGE sql STABLE
    AS $$
  SELECT CASE
    WHEN coalesce(current_setting('mars.company_ids', true), '') = ''
      THEN ARRAY[]::bigint[]
    ELSE string_to_array(current_setting('mars.company_ids', true), ',')::bigint[]
  END
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_artefacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_artefacts (
    id bigint NOT NULL,
    agent_run_id bigint NOT NULL,
    kind character varying NOT NULL,
    title character varying NOT NULL,
    body jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.agent_artefacts FORCE ROW LEVEL SECURITY;


--
-- Name: agent_artefacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_artefacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_artefacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_artefacts_id_seq OWNED BY public.agent_artefacts.id;


--
-- Name: agent_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_runs (
    id bigint NOT NULL,
    agent_key character varying NOT NULL,
    scope_company_ids bigint[] NOT NULL,
    status character varying DEFAULT 'running'::character varying NOT NULL,
    started_at timestamp(6) without time zone NOT NULL,
    finished_at timestamp(6) without time zone,
    input_tokens integer,
    output_tokens integer,
    tool_call_count integer,
    model character varying,
    llm_mode character varying DEFAULT 'replay'::character varying NOT NULL,
    trace jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.agent_runs FORCE ROW LEVEL SECURITY;


--
-- Name: agent_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_runs_id_seq OWNED BY public.agent_runs.id;


--
-- Name: api_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_tokens (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    name character varying NOT NULL,
    token_digest character varying NOT NULL,
    last_used_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: api_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_tokens_id_seq OWNED BY public.api_tokens.id;


--
-- Name: ar_internal_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_internal_metadata (
    key character varying NOT NULL,
    value character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: artefact_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artefact_claims (
    id bigint NOT NULL,
    agent_artefact_id bigint NOT NULL,
    company_id bigint NOT NULL,
    statement character varying NOT NULL,
    evidence_type character varying NOT NULL,
    evidence_table character varying,
    evidence_id bigint,
    stated_value numeric(18,4),
    stated_unit character varying,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.artefact_claims FORCE ROW LEVEL SECURITY;


--
-- Name: artefact_claims_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artefact_claims_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artefact_claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artefact_claims_id_seq OWNED BY public.artefact_claims.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id bigint NOT NULL,
    slug character varying NOT NULL,
    name character varying NOT NULL,
    country character varying(2) NOT NULL,
    vertical character varying NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    arr_cents bigint NOT NULL,
    acquired_on date,
    founded_year integer,
    arr_definition character varying DEFAULT 'contracted_arr'::character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.companies FORCE ROW LEVEL SECURITY;


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    reference character varying NOT NULL,
    signed_on date NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    currency character varying(3) NOT NULL,
    contracted_value_cents bigint NOT NULL,
    terms jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.contracts FORCE ROW LEVEL SECURITY;


--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contracts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: crm_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_accounts (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint,
    owner_employee_id bigint,
    external_ref character varying NOT NULL,
    name character varying NOT NULL,
    country character varying(2),
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.crm_accounts FORCE ROW LEVEL SECURITY;


--
-- Name: crm_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_accounts_id_seq OWNED BY public.crm_accounts.id;


--
-- Name: crm_opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crm_opportunities (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    crm_account_id bigint NOT NULL,
    owner_employee_id bigint,
    external_ref character varying NOT NULL,
    name character varying NOT NULL,
    stage character varying NOT NULL,
    amount_cents bigint,
    currency character varying(3),
    close_date date,
    last_activity_at timestamp(6) without time zone,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.crm_opportunities FORCE ROW LEVEL SECURITY;


--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.crm_opportunities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: crm_opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.crm_opportunities_id_seq OWNED BY public.crm_opportunities.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    external_ref character varying NOT NULL,
    name character varying NOT NULL,
    country character varying(2),
    segment character varying,
    first_seen_on date,
    churned_on date,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.customers FORCE ROW LEVEL SECURITY;


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: document_chunks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_chunks (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    document_id bigint NOT NULL,
    "position" integer NOT NULL,
    content text NOT NULL,
    token_count integer,
    section_ref character varying,
    embedding public.vector(1024),
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    embedding_backend character varying
);

ALTER TABLE ONLY public.document_chunks FORCE ROW LEVEL SECURITY;


--
-- Name: document_chunks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_chunks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_chunks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_chunks_id_seq OWNED BY public.document_chunks.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    kind character varying NOT NULL,
    title character varying NOT NULL,
    source_ref character varying,
    authored_on date,
    body text NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.documents FORCE ROW LEVEL SECURITY;


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    name character varying NOT NULL,
    email character varying,
    job_role character varying,
    started_on date,
    left_on date,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.employees FORCE ROW LEVEL SECURITY;


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grants (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    company_id bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: grants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grants_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grants_id_seq OWNED BY public.grants.id;


--
-- Name: ground_truths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ground_truths (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    defect_class character varying NOT NULL,
    subject_table character varying NOT NULL,
    subject_id bigint NOT NULL,
    expected jsonb DEFAULT '{}'::jsonb NOT NULL,
    generator_version character varying NOT NULL,
    seed integer NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.ground_truths FORCE ROW LEVEL SECURITY;


--
-- Name: ground_truths_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ground_truths_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ground_truths_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ground_truths_id_seq OWNED BY public.ground_truths.id;


--
-- Name: initiatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.initiatives (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    owner_employee_id bigint,
    title character varying NOT NULL,
    thesis text,
    status character varying DEFAULT 'in_progress'::character varying NOT NULL,
    target_metric_key character varying,
    baseline_value numeric(16,4),
    target_value numeric(16,4),
    due_on date,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    target_unit character varying
);

ALTER TABLE ONLY public.initiatives FORCE ROW LEVEL SECURITY;


--
-- Name: initiatives_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.initiatives_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: initiatives_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.initiatives_id_seq OWNED BY public.initiatives.id;


--
-- Name: invoice_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_lines (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    invoice_id bigint NOT NULL,
    description character varying NOT NULL,
    quantity numeric(12,2) DEFAULT 1.0 NOT NULL,
    unit_price_cents bigint NOT NULL,
    amount_cents bigint NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.invoice_lines FORCE ROW LEVEL SECURITY;


--
-- Name: invoice_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoice_lines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoice_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoice_lines_id_seq OWNED BY public.invoice_lines.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    contract_id bigint,
    number character varying NOT NULL,
    issued_on date NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    currency character varying(3) NOT NULL,
    amount_cents bigint NOT NULL,
    status character varying DEFAULT 'paid'::character varying NOT NULL,
    paid_on date,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.invoices FORCE ROW LEVEL SECURITY;


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: metric_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metric_values (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    metric_key character varying NOT NULL,
    grain character varying NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    value numeric(18,4) NOT NULL,
    unit character varying NOT NULL,
    formula character varying NOT NULL,
    input_count integer DEFAULT 0 NOT NULL,
    computed_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.metric_values FORCE ROW LEVEL SECURITY;


--
-- Name: metric_values_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.metric_values_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: metric_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.metric_values_id_seq OWNED BY public.metric_values.id;


--
-- Name: onboarding_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboarding_steps (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    onboarding_id bigint NOT NULL,
    name character varying NOT NULL,
    "position" integer NOT NULL,
    completed_on date,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.onboarding_steps FORCE ROW LEVEL SECURITY;


--
-- Name: onboarding_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.onboarding_steps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: onboarding_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.onboarding_steps_id_seq OWNED BY public.onboarding_steps.id;


--
-- Name: onboardings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onboardings (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    started_on date NOT NULL,
    completed_on date,
    blocked_since date,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.onboardings FORCE ROW LEVEL SECURITY;


--
-- Name: onboardings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.onboardings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: onboardings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.onboardings_id_seq OWNED BY public.onboardings.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    plan character varying NOT NULL,
    seats integer,
    unit_price_cents bigint,
    currency character varying(3) NOT NULL,
    mrr_cents bigint DEFAULT 0 NOT NULL,
    started_on date NOT NULL,
    ends_on date,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL,
    seats_changed_on date
);

ALTER TABLE ONLY public.subscriptions FORCE ROW LEVEL SECURITY;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    external_ref character varying NOT NULL,
    opened_at timestamp(6) without time zone NOT NULL,
    closed_at timestamp(6) without time zone,
    priority character varying DEFAULT 'normal'::character varying NOT NULL,
    category character varying,
    subject character varying NOT NULL,
    sentiment numeric(4,3),
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.support_tickets FORCE ROW LEVEL SECURITY;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: usage_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_daily (
    id bigint NOT NULL,
    company_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    on_date date NOT NULL,
    metric_key character varying NOT NULL,
    value numeric(16,4) NOT NULL
);

ALTER TABLE ONLY public.usage_daily FORCE ROW LEVEL SECURITY;


--
-- Name: usage_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usage_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usage_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usage_daily_id_seq OWNED BY public.usage_daily.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying NOT NULL,
    name character varying NOT NULL,
    role character varying NOT NULL,
    created_at timestamp(6) without time zone NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: agent_artefacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_artefacts ALTER COLUMN id SET DEFAULT nextval('public.agent_artefacts_id_seq'::regclass);


--
-- Name: agent_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs ALTER COLUMN id SET DEFAULT nextval('public.agent_runs_id_seq'::regclass);


--
-- Name: api_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens ALTER COLUMN id SET DEFAULT nextval('public.api_tokens_id_seq'::regclass);


--
-- Name: artefact_claims id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artefact_claims ALTER COLUMN id SET DEFAULT nextval('public.artefact_claims_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: crm_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_accounts ALTER COLUMN id SET DEFAULT nextval('public.crm_accounts_id_seq'::regclass);


--
-- Name: crm_opportunities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities ALTER COLUMN id SET DEFAULT nextval('public.crm_opportunities_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: document_chunks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks ALTER COLUMN id SET DEFAULT nextval('public.document_chunks_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: grants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grants ALTER COLUMN id SET DEFAULT nextval('public.grants_id_seq'::regclass);


--
-- Name: ground_truths id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ground_truths ALTER COLUMN id SET DEFAULT nextval('public.ground_truths_id_seq'::regclass);


--
-- Name: initiatives id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives ALTER COLUMN id SET DEFAULT nextval('public.initiatives_id_seq'::regclass);


--
-- Name: invoice_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines ALTER COLUMN id SET DEFAULT nextval('public.invoice_lines_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: metric_values id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_values ALTER COLUMN id SET DEFAULT nextval('public.metric_values_id_seq'::regclass);


--
-- Name: onboarding_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_steps ALTER COLUMN id SET DEFAULT nextval('public.onboarding_steps_id_seq'::regclass);


--
-- Name: onboardings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboardings ALTER COLUMN id SET DEFAULT nextval('public.onboardings_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: usage_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_daily ALTER COLUMN id SET DEFAULT nextval('public.usage_daily_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: agent_artefacts agent_artefacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_artefacts
    ADD CONSTRAINT agent_artefacts_pkey PRIMARY KEY (id);


--
-- Name: agent_runs agent_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);


--
-- Name: api_tokens api_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_pkey PRIMARY KEY (id);


--
-- Name: ar_internal_metadata ar_internal_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_internal_metadata
    ADD CONSTRAINT ar_internal_metadata_pkey PRIMARY KEY (key);


--
-- Name: artefact_claims artefact_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artefact_claims
    ADD CONSTRAINT artefact_claims_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: crm_accounts crm_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_accounts
    ADD CONSTRAINT crm_accounts_pkey PRIMARY KEY (id);


--
-- Name: crm_opportunities crm_opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT crm_opportunities_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: grants grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grants
    ADD CONSTRAINT grants_pkey PRIMARY KEY (id);


--
-- Name: ground_truths ground_truths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ground_truths
    ADD CONSTRAINT ground_truths_pkey PRIMARY KEY (id);


--
-- Name: initiatives initiatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT initiatives_pkey PRIMARY KEY (id);


--
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: metric_values metric_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_values
    ADD CONSTRAINT metric_values_pkey PRIMARY KEY (id);


--
-- Name: onboarding_steps onboarding_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_steps
    ADD CONSTRAINT onboarding_steps_pkey PRIMARY KEY (id);


--
-- Name: onboardings onboardings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboardings
    ADD CONSTRAINT onboardings_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: usage_daily usage_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_daily
    ADD CONSTRAINT usage_daily_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_metric_values_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_metric_values_unique ON public.metric_values USING btree (company_id, metric_key, grain, period_start);


--
-- Name: idx_usage_daily_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_usage_daily_unique ON public.usage_daily USING btree (company_id, customer_id, metric_key, on_date);


--
-- Name: index_agent_artefacts_on_agent_run_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_agent_artefacts_on_agent_run_id ON public.agent_artefacts USING btree (agent_run_id);


--
-- Name: index_agent_runs_on_agent_key_and_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_agent_runs_on_agent_key_and_started_at ON public.agent_runs USING btree (agent_key, started_at);


--
-- Name: index_agent_runs_on_scope_company_ids; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_agent_runs_on_scope_company_ids ON public.agent_runs USING gin (scope_company_ids);


--
-- Name: index_api_tokens_on_token_digest; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_api_tokens_on_token_digest ON public.api_tokens USING btree (token_digest);


--
-- Name: index_api_tokens_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_api_tokens_on_user_id ON public.api_tokens USING btree (user_id);


--
-- Name: index_artefact_claims_on_agent_artefact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_artefact_claims_on_agent_artefact_id ON public.artefact_claims USING btree (agent_artefact_id);


--
-- Name: index_artefact_claims_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_artefact_claims_on_company_id ON public.artefact_claims USING btree (company_id);


--
-- Name: index_companies_on_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_companies_on_slug ON public.companies USING btree (slug);


--
-- Name: index_contracts_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_contracts_on_company_id ON public.contracts USING btree (company_id);


--
-- Name: index_contracts_on_company_id_and_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_contracts_on_company_id_and_reference ON public.contracts USING btree (company_id, reference);


--
-- Name: index_contracts_on_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_contracts_on_customer_id ON public.contracts USING btree (customer_id);


--
-- Name: index_crm_accounts_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_accounts_on_company_id ON public.crm_accounts USING btree (company_id);


--
-- Name: index_crm_accounts_on_company_id_and_external_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_crm_accounts_on_company_id_and_external_ref ON public.crm_accounts USING btree (company_id, external_ref);


--
-- Name: index_crm_accounts_on_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_accounts_on_customer_id ON public.crm_accounts USING btree (customer_id);


--
-- Name: index_crm_accounts_on_owner_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_accounts_on_owner_employee_id ON public.crm_accounts USING btree (owner_employee_id);


--
-- Name: index_crm_opportunities_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_opportunities_on_company_id ON public.crm_opportunities USING btree (company_id);


--
-- Name: index_crm_opportunities_on_company_id_and_external_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_crm_opportunities_on_company_id_and_external_ref ON public.crm_opportunities USING btree (company_id, external_ref);


--
-- Name: index_crm_opportunities_on_company_id_and_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_opportunities_on_company_id_and_stage ON public.crm_opportunities USING btree (company_id, stage);


--
-- Name: index_crm_opportunities_on_crm_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_opportunities_on_crm_account_id ON public.crm_opportunities USING btree (crm_account_id);


--
-- Name: index_crm_opportunities_on_owner_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_crm_opportunities_on_owner_employee_id ON public.crm_opportunities USING btree (owner_employee_id);


--
-- Name: index_customers_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_customers_on_company_id ON public.customers USING btree (company_id);


--
-- Name: index_customers_on_company_id_and_churned_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_customers_on_company_id_and_churned_on ON public.customers USING btree (company_id, churned_on);


--
-- Name: index_customers_on_company_id_and_external_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_customers_on_company_id_and_external_ref ON public.customers USING btree (company_id, external_ref);


--
-- Name: index_document_chunks_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_chunks_on_company_id ON public.document_chunks USING btree (company_id);


--
-- Name: index_document_chunks_on_company_id_and_embedding_backend; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_chunks_on_company_id_and_embedding_backend ON public.document_chunks USING btree (company_id, embedding_backend);


--
-- Name: index_document_chunks_on_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_chunks_on_document_id ON public.document_chunks USING btree (document_id);


--
-- Name: index_document_chunks_on_document_id_and_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_document_chunks_on_document_id_and_position ON public.document_chunks USING btree (document_id, "position");


--
-- Name: index_documents_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_documents_on_company_id ON public.documents USING btree (company_id);


--
-- Name: index_documents_on_company_id_and_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_documents_on_company_id_and_kind ON public.documents USING btree (company_id, kind);


--
-- Name: index_employees_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_employees_on_company_id ON public.employees USING btree (company_id);


--
-- Name: index_employees_on_company_id_and_left_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_employees_on_company_id_and_left_on ON public.employees USING btree (company_id, left_on);


--
-- Name: index_grants_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_grants_on_company_id ON public.grants USING btree (company_id);


--
-- Name: index_grants_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_grants_on_user_id ON public.grants USING btree (user_id);


--
-- Name: index_grants_on_user_id_and_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_grants_on_user_id_and_company_id ON public.grants USING btree (user_id, company_id);


--
-- Name: index_ground_truths_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ground_truths_on_company_id ON public.ground_truths USING btree (company_id);


--
-- Name: index_ground_truths_on_defect_class_and_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_ground_truths_on_defect_class_and_company_id ON public.ground_truths USING btree (defect_class, company_id);


--
-- Name: index_initiatives_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_initiatives_on_company_id ON public.initiatives USING btree (company_id);


--
-- Name: index_initiatives_on_company_id_and_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_initiatives_on_company_id_and_status ON public.initiatives USING btree (company_id, status);


--
-- Name: index_initiatives_on_owner_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_initiatives_on_owner_employee_id ON public.initiatives USING btree (owner_employee_id);


--
-- Name: index_invoice_lines_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_lines_on_company_id ON public.invoice_lines USING btree (company_id);


--
-- Name: index_invoice_lines_on_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_lines_on_invoice_id ON public.invoice_lines USING btree (invoice_id);


--
-- Name: index_invoices_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_company_id ON public.invoices USING btree (company_id);


--
-- Name: index_invoices_on_company_id_and_issued_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_company_id_and_issued_on ON public.invoices USING btree (company_id, issued_on);


--
-- Name: index_invoices_on_company_id_and_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_invoices_on_company_id_and_number ON public.invoices USING btree (company_id, number);


--
-- Name: index_invoices_on_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_contract_id ON public.invoices USING btree (contract_id);


--
-- Name: index_invoices_on_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoices_on_customer_id ON public.invoices USING btree (customer_id);


--
-- Name: index_metric_values_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_metric_values_on_company_id ON public.metric_values USING btree (company_id);


--
-- Name: index_onboarding_steps_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_onboarding_steps_on_company_id ON public.onboarding_steps USING btree (company_id);


--
-- Name: index_onboarding_steps_on_onboarding_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_onboarding_steps_on_onboarding_id ON public.onboarding_steps USING btree (onboarding_id);


--
-- Name: index_onboarding_steps_on_onboarding_id_and_position; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_onboarding_steps_on_onboarding_id_and_position ON public.onboarding_steps USING btree (onboarding_id, "position");


--
-- Name: index_onboardings_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_onboardings_on_company_id ON public.onboardings USING btree (company_id);


--
-- Name: index_onboardings_on_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_onboardings_on_customer_id ON public.onboardings USING btree (customer_id);


--
-- Name: index_subscriptions_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_subscriptions_on_company_id ON public.subscriptions USING btree (company_id);


--
-- Name: index_subscriptions_on_company_id_and_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_subscriptions_on_company_id_and_status ON public.subscriptions USING btree (company_id, status);


--
-- Name: index_subscriptions_on_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_subscriptions_on_customer_id ON public.subscriptions USING btree (customer_id);


--
-- Name: index_support_tickets_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_support_tickets_on_company_id ON public.support_tickets USING btree (company_id);


--
-- Name: index_support_tickets_on_company_id_and_external_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_support_tickets_on_company_id_and_external_ref ON public.support_tickets USING btree (company_id, external_ref);


--
-- Name: index_support_tickets_on_company_id_and_opened_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_support_tickets_on_company_id_and_opened_at ON public.support_tickets USING btree (company_id, opened_at);


--
-- Name: index_support_tickets_on_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_support_tickets_on_customer_id ON public.support_tickets USING btree (customer_id);


--
-- Name: index_usage_daily_on_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_usage_daily_on_company_id ON public.usage_daily USING btree (company_id);


--
-- Name: index_usage_daily_on_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_usage_daily_on_customer_id ON public.usage_daily USING btree (customer_id);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email);


--
-- Name: initiatives fk_rails_03d8d49143; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT fk_rails_03d8d49143 FOREIGN KEY (owner_employee_id) REFERENCES public.employees(id);


--
-- Name: invoices fk_rails_0d349e632f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_rails_0d349e632f FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: document_chunks fk_rails_0dad377265; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT fk_rails_0dad377265 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: subscriptions fk_rails_0e8fef2fc0; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT fk_rails_0e8fef2fc0 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: onboardings fk_rails_152fb910cf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboardings
    ADD CONSTRAINT fk_rails_152fb910cf FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: employees fk_rails_15ca1438d5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT fk_rails_15ca1438d5 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: grants fk_rails_35cad80142; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grants
    ADD CONSTRAINT fk_rails_35cad80142 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: agent_artefacts fk_rails_3a57307850; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_artefacts
    ADD CONSTRAINT fk_rails_3a57307850 FOREIGN KEY (agent_run_id) REFERENCES public.agent_runs(id);


--
-- Name: usage_daily fk_rails_3c5993045b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_daily
    ADD CONSTRAINT fk_rails_3c5993045b FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: ground_truths fk_rails_3d3a869046; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ground_truths
    ADD CONSTRAINT fk_rails_3d3a869046 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: invoices fk_rails_433d4c368d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_rails_433d4c368d FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: metric_values fk_rails_4a3d0f86d8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metric_values
    ADD CONSTRAINT fk_rails_4a3d0f86d8 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: onboarding_steps fk_rails_4e033fc785; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_steps
    ADD CONSTRAINT fk_rails_4e033fc785 FOREIGN KEY (onboarding_id) REFERENCES public.onboardings(id);


--
-- Name: support_tickets fk_rails_50a3a89e98; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_rails_50a3a89e98 FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: invoice_lines fk_rails_52f0b3d2a3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT fk_rails_52f0b3d2a3 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: support_tickets fk_rails_580a6b287c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT fk_rails_580a6b287c FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: onboardings fk_rails_581678bcbd; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboardings
    ADD CONSTRAINT fk_rails_581678bcbd FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: crm_opportunities fk_rails_61ddab61a6; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT fk_rails_61ddab61a6 FOREIGN KEY (owner_employee_id) REFERENCES public.employees(id);


--
-- Name: subscriptions fk_rails_66eb6b32c1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT fk_rails_66eb6b32c1 FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: contracts fk_rails_676562988a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT fk_rails_676562988a FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: crm_accounts fk_rails_68844e9fb7; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_accounts
    ADD CONSTRAINT fk_rails_68844e9fb7 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: onboarding_steps fk_rails_68c9ca3f8c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onboarding_steps
    ADD CONSTRAINT fk_rails_68c9ca3f8c FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: artefact_claims fk_rails_81389d6bd9; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artefact_claims
    ADD CONSTRAINT fk_rails_81389d6bd9 FOREIGN KEY (agent_artefact_id) REFERENCES public.agent_artefacts(id);


--
-- Name: documents fk_rails_83141d4c8c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT fk_rails_83141d4c8c FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: initiatives fk_rails_8fd87a6ae5; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT fk_rails_8fd87a6ae5 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: invoice_lines fk_rails_93b334df88; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT fk_rails_93b334df88 FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: document_chunks fk_rails_99b41ada32; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_chunks
    ADD CONSTRAINT fk_rails_99b41ada32 FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: crm_opportunities fk_rails_9dd6390599; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT fk_rails_9dd6390599 FOREIGN KEY (crm_account_id) REFERENCES public.crm_accounts(id);


--
-- Name: contracts fk_rails_a00d802491; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT fk_rails_a00d802491 FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: grants fk_rails_a2265328fb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grants
    ADD CONSTRAINT fk_rails_a2265328fb FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: usage_daily fk_rails_aaee4f33b8; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_daily
    ADD CONSTRAINT fk_rails_aaee4f33b8 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: artefact_claims fk_rails_b1b648e7fb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artefact_claims
    ADD CONSTRAINT fk_rails_b1b648e7fb FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: crm_accounts fk_rails_c21c860270; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_accounts
    ADD CONSTRAINT fk_rails_c21c860270 FOREIGN KEY (owner_employee_id) REFERENCES public.employees(id);


--
-- Name: invoices fk_rails_c5bf8c7cce; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT fk_rails_c5bf8c7cce FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: crm_accounts fk_rails_cece9c00cc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_accounts
    ADD CONSTRAINT fk_rails_cece9c00cc FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: crm_opportunities fk_rails_dc9684bc67; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crm_opportunities
    ADD CONSTRAINT fk_rails_dc9684bc67 FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: customers fk_rails_ef51a916ef; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT fk_rails_ef51a916ef FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: api_tokens fk_rails_f16b5e0447; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT fk_rails_f16b5e0447 FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: agent_artefacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_artefacts ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: artefact_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.artefact_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: crm_opportunities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: document_chunks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: ground_truths; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ground_truths ENABLE ROW LEVEL SECURITY;

--
-- Name: initiatives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: metric_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.metric_values ENABLE ROW LEVEL SECURITY;

--
-- Name: onboarding_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: onboardings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onboardings ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_artefacts tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.agent_artefacts USING ((EXISTS ( SELECT 1
   FROM public.agent_runs r
  WHERE (r.id = agent_artefacts.agent_run_id))));


--
-- Name: agent_runs tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.agent_runs USING ((scope_company_ids <@ public.mars_company_ids()));


--
-- Name: artefact_claims tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.artefact_claims USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: companies tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.companies USING ((id = ANY (public.mars_company_ids())));


--
-- Name: contracts tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.contracts USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: crm_accounts tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.crm_accounts USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: crm_opportunities tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.crm_opportunities USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: customers tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.customers USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: document_chunks tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.document_chunks USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: documents tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.documents USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: employees tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.employees USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: ground_truths tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.ground_truths USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: initiatives tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.initiatives USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: invoice_lines tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.invoice_lines USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: invoices tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.invoices USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: metric_values tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.metric_values USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: onboarding_steps tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.onboarding_steps USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: onboardings tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.onboardings USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: subscriptions tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.subscriptions USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: support_tickets tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.support_tickets USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: usage_daily tenant_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenant_isolation ON public.usage_daily USING ((company_id = ANY (public.mars_company_ids())));


--
-- Name: usage_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_daily ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

SET search_path TO "$user", public;

INSERT INTO "schema_migrations" (version) VALUES
('20260912000006'),
('20260912000005'),
('20260912000004'),
('20260912000003'),
('20260912000002'),
('20260912000001');

