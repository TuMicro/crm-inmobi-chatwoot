# [turuta] Instagram y TikTok con varios dominios (docs/21 § 4.4 en crm-inmobi)
require 'rails_helper'

RSpec.describe Turuta::DominioDeOrigen do
  # Como hoy: FRONTEND_URL es el dominio principal y la vuelta, y los de los clientes van de extra
  let(:sin_vuelta) { { 'FRONTEND_URL' => 'https://app.crm.test', 'CHATWOOT_HOSTS_EXTRA' => 'flyboard.crm.test, crm.cliente.test' } }
  # Como produccion desde el 03/11 (docs/24 § 6b): FRONTEND_URL es el de MadHouse y la vuelta, la de app.crm
  let(:con_vuelta) do
    { 'FRONTEND_URL' => 'https://crm.cliente.test', 'CHATWOOT_HOSTS_EXTRA' => 'app.crm.test flyboard.crm.test',
      'TURUTA_URL_DE_VUELTA' => 'https://app.crm.test' }
  end

  describe '.url_de_vuelta' do
    it 'usa TURUTA_URL_DE_VUELTA, sin la barra final y con https si no lo lleva' do
      expect(described_class.url_de_vuelta(con_vuelta)).to eq('https://app.crm.test')
      expect(described_class.url_de_vuelta(con_vuelta.merge('TURUTA_URL_DE_VUELTA' => ' https://app.crm.test/ '))).to eq('https://app.crm.test')
      expect(described_class.url_de_vuelta(con_vuelta.merge('TURUTA_URL_DE_VUELTA' => 'app.crm.test'))).to eq('https://app.crm.test')
    end

    it 'sin TURUTA_URL_DE_VUELTA (o vacia, como la pasa el compose), FRONTEND_URL como en Chatwoot' do
      expect(described_class.url_de_vuelta(sin_vuelta)).to eq('https://app.crm.test')
      expect(described_class.url_de_vuelta(con_vuelta.merge('TURUTA_URL_DE_VUELTA' => ''))).to eq('https://crm.cliente.test')
      expect(described_class.url_de_vuelta({})).to eq('http://localhost:3000')
    end
  end

  describe '.origen' do
    it 'con la vuelta en app.crm: el principal y los extra vuelven a ellos mismos, y app.crm no lleva origen' do
      expect(described_class.origen('crm.cliente.test', con_vuelta)).to eq('crm.cliente.test')
      expect(described_class.origen('Flyboard.CRM.test', con_vuelta)).to eq('flyboard.crm.test')
      expect(described_class.origen('app.crm.test', con_vuelta)).to be_nil
      expect(described_class.origen('malo.test', con_vuelta)).to be_nil
    end

    it 'sin TURUTA_URL_DE_VUELTA: solo los extra, como antes' do
      expect(described_class.origen('crm.cliente.test', sin_vuelta)).to eq('crm.cliente.test')
      expect(described_class.origen('flyboard.crm.test', sin_vuelta)).to eq('flyboard.crm.test')
      expect(described_class.origen('app.crm.test', sin_vuelta)).to be_nil
      con_https = sin_vuelta.merge('CHATWOOT_HOSTS_EXTRA' => 'https://crm.cliente.test/')
      expect(described_class.origen('crm.cliente.test', con_https)).to eq('crm.cliente.test')
      expect(described_class.origen('crm.cliente.test', sin_vuelta.merge('CHATWOOT_HOSTS_EXTRA' => ''))).to be_nil
    end

    it 'deja fuera lo que no es un dominio de la lista' do
      expect(described_class.origen('cliente.test', sin_vuelta)).to be_nil
      expect(described_class.origen('crm.cliente.test.malo.test', sin_vuelta)).to be_nil
      expect(described_class.origen('crm.cliente.test@malo.test', sin_vuelta.merge('CHATWOOT_HOSTS_EXTRA' => 'crm.cliente.test@malo.test'))).to be_nil
      expect(described_class.origen(nil, sin_vuelta)).to be_nil
      expect(described_class.origen('', con_vuelta)).to be_nil
    end

    it 'lee las variables del entorno' do
      with_modified_env FRONTEND_URL: 'https://crm.cliente.test', CHATWOOT_HOSTS_EXTRA: 'app.crm.test',
                        TURUTA_URL_DE_VUELTA: 'https://app.crm.test' do
        expect(described_class.origen('crm.cliente.test')).to eq('crm.cliente.test')
        expect(described_class.origen('app.crm.test')).to be_nil
        expect(described_class.url_de_vuelta).to eq('https://app.crm.test')
      end
    end
  end

  describe '.opciones_de_url' do
    it 'manda al dominio de origen con https' do
      expect(described_class.opciones_de_url('crm.cliente.test', con_vuelta)).to eq(host: 'crm.cliente.test', port: nil, protocol: 'https')
      expect(described_class.opciones_de_url('crm.cliente.test:8443', sin_vuelta.merge('CHATWOOT_HOSTS_EXTRA' => 'crm.cliente.test:8443')))
        .to eq(host: 'crm.cliente.test', port: 8443, protocol: 'https')
    end

    it 'no cambia nada si no hay origen' do
      expect(described_class.opciones_de_url('app.crm.test', con_vuelta)).to eq({})
      expect(described_class.opciones_de_url('malo.test', con_vuelta)).to eq({})
      expect(described_class.opciones_de_url(nil, sin_vuelta)).to eq({})
    end
  end
end
