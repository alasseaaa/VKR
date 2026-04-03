# genapp/templatetags/extras.py
from django import template

register = template.Library()

@register.filter
def get_item(dictionary, key):
    """Получить значение из словаря по ключу"""
    return dictionary.get(key, 0)

@register.filter
def get(dictionary, key):
    """Альтернативное имя фильтра"""
    return dictionary.get(key)

@register.filter
def get_item_or_zero(dictionary, key):
    """Получить значение или 0 если нет"""
    return dictionary.get(key, 0)