# [turuta] Prueba sin Rails de app/services/filters/custom_attribute_filter_helper.rb
# (la CI del fork no corre rspec): la SQL de un atributo personalizado con
# "no igual a" tiene que poder ir seguida de otra condicion (20/10).
#
#   ruby script/turuta/prueba_filtros_no_igual.rb

# Lo poco de ActiveSupport que usa el helper.
class Object
  def blank? = respond_to?(:empty?) ? empty? : !self
  def present? = !blank?
  def presence = present? ? self : nil
  def in?(coleccion) = coleccion.include?(self)
  def try(metodo, *args) = respond_to?(metodo) ? public_send(metodo, *args) : nil
end

module ActiveRecord
  class Base
    # Lo justo de sanitize_sql_array: cada ? por su valor entre comillas.
    def self.sanitize_sql_array(arr)
      sql, *valores = arr
      valores.reduce(sql) { |s, v| s.sub('?', "'#{v}'") }
    end
  end
end

module Filters; end
require_relative '../../app/services/filters/custom_attribute_filter_helper'

class FiltroDePrueba
  include Filters::CustomAttributeFilterHelper
  ATTRIBUTE_MODEL = 'conversation_attribute'.freeze
  ATTRIBUTE_TYPES = { 'list' => 'text', 'number' => 'numeric' }.freeze

  def initialize(tipo)
    @tipo = tipo
  end

  # Lo que hace FilterService con cada operador, en corto.
  def filter_operation(query_hash, indice)
    case query_hash[:filter_operator]
    when 'equal_to' then "IN (:value_#{indice})"
    when 'not_equal_to' then "NOT IN (:value_#{indice})"
    when 'contains' then "ILIKE ANY (ARRAY[:value_#{indice}])"
    end
  end

  def custom_attribute(_clave, _cuenta, _modelo)
    @custom_attribute = Struct.new(:attribute_display_type).new(@tipo)
  end
end

def condicion(operador, enlace, tipo = 'list', clave = 'crm_stage_name', modelo = 'conversation_attribute')
  FiltroDePrueba.new(tipo).custom_attribute_query(
    { attribute_key: clave, filter_operator: operador, query_operator: enlace }, modelo, 0
  )
end

def comprobar(nombre, sql)
  raise "#{nombre}: queda un operador colgando: #{sql}" if sql =~ /\b(AND|OR)\s+(AND|OR)\b/i
  raise "#{nombre}: parentesis descuadrados: #{sql}" unless sql.count('(') == sql.count(')')

  puts "OK #{nombre}"
end

# El caso que fallaba: "no igual a" primero, unido con AND a otra condicion.
primero = condicion('not_equal_to', 'AND')
segundo = condicion('contains', nil, 'list', 'distritos_de_interes', 'contact_attribute')
sql = "#{primero.strip} #{segundo.strip}"
comprobar('no igual a, primero', sql)
unless sql.start_with?("(LOWER(conversations.custom_attributes ->> 'crm_stage_name')::text NOT IN (:value_0) OR ") &&
       sql.include?("IS NULL) AND (LOWER(contacts.custom_attributes")
  raise "el OR ... IS NULL tiene que quedar dentro de su parentesis: #{sql}"
end

# Al reves, y sola: tambien.
comprobar('no igual a, ultima', "#{condicion('contains', 'AND').strip} #{condicion('not_equal_to', nil).strip}")
comprobar('no igual a, sola', condicion('not_equal_to', nil))
comprobar('numero', condicion('equal_to', 'OR', 'number'))
puts 'Filtros "no igual a" OK'
